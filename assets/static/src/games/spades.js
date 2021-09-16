import {
  GameController
} from './common.js';

import {
  UserCache
} from '../utils/cache.js';

import {
  CardHand,
  Card,
} from './card.js';

class SpadesController extends GameController {
  async assignTeams(team_data) {
    return await this.wsController.sendAndWait({
      'message_type': 'assign',
      ...team_data,
    });
  }

  async deal() {
    return await this.wsController.sendAndWait({
      'message_type': 'deal',
    });
  }

  async decide(keep) {
    return await this.wsController.send({
      'message_type': 'decide',
      'keep': keep,
    });
  }

  async look() {
    return await this.wsController.sendAndWait({
      'message_type': 'look',
    });
  }

  async bid(amount) {
    return await this.wsController.send({
      'message_type': 'bid',
      'bid': +amount,
    });
  }

  async play(card) {
    return await this.wsController.send({
      'message_type': 'play',
      'card_id': +card,
    });
  }
}

// Unlike Rush, where we have to duplicate logic on the client and server to
// move and drop tiles &c, here we can lazily take values from the server and
// blindly update ours. This is because we only do a single action at a time,
// and unless there's a network glitch (in which case server wins anyways),
// the data always aligns after the message is confirmed by the server.
class SpadesData {
  constructor(game) {
    this.game = game;
  }
}

class SpadesGame {
  constructor(game, readonly) {
    this.game = game;

    if (readonly === undefined || readonly === null || readonly === false) {
      this.controller = new SpadesController(game);
      this.controller.onMessage("state", (data) => { this.handleNewState(data) });
      this.controller.onMessage("game-state", (data) => { this.handleNewState(data) });
      this.controller.onMessage("synopsis", (data) => { this.handleNewSynopsis(data) });
    }

    this.data = new SpadesData(game);
    this.synopsis = {};

    this.started = false;
    this.dealt = false;
    this.split = false;
    this.bidded = false;
    this.finished = false;

    this.onChange = () => {};

    this.hasTeams = true;
  }

  async handleNewState(message) {
    // Spades is a simpler game than Rush. We can always take the hand from the
    // server as this is a turn-based game. We won't get out of sync like Rush.

    // Update some metadata about game progress.
    this.started = message.started;
    this.dealt = message.dealt;
    this.split = message.split;
    this.bidded = message.bidded;
    this.finished = message.finished;

    // Then update the main data object.
    this.data.hand = message?.hand ? CardHand.deserialize(message.hand) : null;
    if (this.data.hand != null) {
      this.data.hand.cardSort(true, true, false);
    }
    this.data.drawn = message?.drawn ? Card.deserialize(message.drawn) : null;
    this.data.peeked = message?.peeked;
    this.data.bid = message?.bid;
    this.data.tricks = message?.tricks;
    this.data.score = message?.score;
    this.data.overtakes = message?.overtakes;
    this.data.turn = message?.turn;
    this.data.leader = message?.leader;
    this.data.dealer = message?.dealer;
    this.data.played = message?.played ? CardHand.deserialize(message.played) : null;
    this.data.spades_broken = message?.spades_broken;
    this.data.history = message?.history ? message.history.map(CardHand.deserialize) : null;
    this.data.config = message?.config;
    if (this.data.config) {
      this.game.config = this.data.config;
    }

    // We've gotta sync up who_played with our played data.
    if (!this.data.who_played || (message.who_played && message.played?.length === 1 && +this.data.who_played[0].id !== +message.who_played[0])) {
      this.data.who_played = [];
      for (let uid of message.who_played) {
        let player = await UserCache.FromId(uid);
        this.data.who_played.push(player);
      }
    }

    this.onChange(this);
  }

  async handleNewSynopsis(message) {
    // Spades is a simpler game than Rush. We can always take the hand from the
    // server as this is a turn-based game. We won't get out of sync like Rush.
    if (message.players) {
      for (let player of message.players) {
        player.user = await UserCache.FromId(player.user);
      }
    }
    Object.assign(this.synopsis, message);

    this.onChange(this);
  }

  static bid_values = {
    "triple nil": 21,
    "blind nil": 20,
    "nil": 19,
    "one": 1,
    "two": 2,
    "three": 3,
    "four": 4,
    "five": 5,
    "six": 6,
    "seven": 7,
    "eight": 8,
    "nine": 9,
    "ten": 10,
    "eleven": 11,
    "twelve": 12,
    "thirteen": 13,
    "fourteen": 14,
    "fifteen": 15,
    "sixteen": 16,
    "seventeen": 17,
    "eighteen": 18,
  };
  static bid_names = {
    21: "triple nil",
    20: "blind nil",
    19: "nil",
    1: "one",
    2: "two",
    3: "three",
    4: "four",
    5: "five",
    6: "six",
    7: "seven",
    8: "eight",
    9: "nine",
    10: "ten",
    11: "eleven",
    12: "twelve",
    13: "thirteen",
    14: "fourteen",
    15: "fifteen",
    16: "sixteen",
    17: "seventeen",
    18: "eighteen",
  };

  valid_bids() {
    var labellify = l => ({label: l, value: SpadesGame.bid_values[l] });
    // Handle blind bidding. When we've not yet peeked, we have to bid blind.
    if (this.data.hand === null && !this.data.peeked) {
      return ["blind nil"].map(labellify);
    }

    var result = [
      "one",
      "two",
      "three",
      "four",
      "five",
      "six",
      "seven",
      "eight",
      "nine",
      "ten",
      "eleven",
      "twelve",
      "thirteen",
      "fourteen",
      "fifteen",
      "sixteen",
      "seventeen",
      "eighteen",
    ];

    // Shrink to possible bids from the above.
    result = result.slice(0, this.data.hand.cards.length);

    if (this.data.config.with_nil) {
      result.push("nil");
    }

    if (this.data.config.with_triple_nil) {
      result.push("triple nil");
    }

    return result.map(labellify);
  }

  my_turn() {
    return +this.data.turn === +this.game.user.id || +this.data.turn?.id === +this.game.user.id;
  }

  my_deal() {
    return +this.data.dealer === +this.game.user.id;
  }

  async deal() {
    return this.controller.deal();
  }

  async decide(keep) {
    return this.controller.decide(keep);
  }

  async look() {
    return this.controller.look();
  }

  async bid(amount) {
    return this.controller.bid(amount);
  }

  async play(card) {
    return this.controller.play(card);
  }

  close() {
    this.controller.close();
    this.onChange = (e) => { return true };
  }
}

export {
  SpadesData,
  SpadesGame,
  SpadesController,
};
