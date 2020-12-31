import {
  WebSocketController
} from './common.js';

import {
  CardHand,
  Card,
} from './card.js';

class SpadesController {
  constructor(game) {
    this.game = game;

    this.wsController = new WebSocketController(this.game);
  }

  async admitPlayer(player, admit, playing) {
    return await this.wsController.send({
      'message_type': 'admit',
      'target_id': +player,
      'admit': admit,
      'playing': playing,
    });
  }

  async markReady(ready) {
    return await this.wsController.send({
      'message_type': 'ready',
      'ready': ready,
    });
  }

  async startGame() {
    return await this.wsController.sendAndWait({
      'message_type': 'start',
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

  async peek() {
    return await this.wsController.sendAndWait({
      'message_type': 'peek',
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

  onMessage(type, handler) {
    return this.wsController.onMessage(type, handler);
  }

  close() {
    this.wsController.close();
  }
}

// Unlike Rush, where we have to duplicate logic on the client and server to
// move and drop tiles &c, here we can lazily take values from the server and
// blindly update ours. This is because we only do a single action at a time,
// and unless there's a network glitch (in which case server wins anyways),
// the data always aligns after the message is confirmed by the server.
class SpadesData {
  constructor(game, hand, drawn, peeked, bid, tricks, score, overtakes, turn, leader, played, spades_broken, config) {
    this.game = game;

    this.hand = hand;
    this.drawn = drawn;
    this.peeked = peeked;

    this.bid = bid;
    this.tricks = tricks;

    this.score = score;
    this.overtakes = overtakes;

    this.turn = turn;
    this.leader = leader;
    this.played = played;
    this.spades_broken = spades_broken;

    this.config = config;
  }
}

class SpadesGame {
  constructor(game, readonly) {
    this.game = game;

    if (readonly === undefined || readonly === null || readonly === false) {
      this.controller = new SpadesController(game);
      this.controller.onMessage("state", (data) => { this.handleNewState(data) });
      this.controller.onMessage("synopsis", (data) => { this.handleNewSynopsis(data) });
    }

    this.data = new SpadesData(game);
    this.synopsis = {};

    this.started = false;
    this.dealt = false;
    this.bidded = false;
    this.finished = false;

    this.onChange = () => {};
  }

  handleNewState(message) {
    // Spades is a simpler game than Rush. We can always take the hand from the
    // server as this is a turn-based game. We won't get out of sync like Rush.

    // Update some metadata about game progress.
    this.started = message.started;
    this.dealt = message.dealt;
    this.bidded = message.bidded;
    this.finished = message.finished;

    // Then update the main data object.
    this.data.hand = message?.hand ? CardHand.deserialize(message.hand) : null;
    this.data.drawn = message?.drawn ? Card.deserialize(message.drawn) : null;
    this.data.peeked = message?.peeked;
    this.data.bid = message?.bid;
    this.data.tricks = message?.tricks;
    this.data.score = message?.score;
    this.data.overtakes = message?.overtakes;
    this.data.turn = message?.turn;
    this.data.leader = message?.leader;
    this.data.played = message?.played ? CardHand.deserialize(message.played) : null;
    this.data.spades_broken = message?.spades_broken;
    this.data.history = message?.history ? message.history.map(CardHand.deserialize) : null;
    this.data.config = message?.config;

    this.onChange(this);
  }

  handleNewSynopsis(message) {
    // Spades is a simpler game than Rush. We can always take the hand from the
    // server as this is a turn-based game. We won't get out of sync like Rush.
    Object.assign(this.synopsis, message);

    this.onChange(this);
  }

  valid_bids() {
    // Handle blind bidding. When we've not yet peeked, we have to bid blind.
    if (this.data.hand === null && !this.data.peeked) {
      return [
        {
          "label": "blind nil",
          "value": 20,
        }
      ];
    }

    var result = [
      {
        "label": "one",
        "value": 1,
      },
      {
        "label": "two",
        "value": 2,
      },
      {
        "label": "three",
        "value": 3,
      },
      {
        "label": "four",
        "value": 4,
      },
      {
        "label": "five",
        "value": 5,
      },
      {
        "label": "six",
        "value": 6,
      },
      {
        "label": "seven",
        "value": 7,
      },
      {
        "label": "eight",
        "value": 8,
      },
      {
        "label": "nine",
        "value": 9,
      },
      {
        "label": "ten",
        "value": 10,
      },
      {
        "label": "eleven",
        "value": 11,
      },
      {
        "label": "twelve",
        "value": 12,
      },
      {
        "label": "thirteen",
        "value": 13,
      },
      {
        "label": "fourteen",
        "value": 14,
      },
      {
        "label": "fifteen",
        "value": 15,
      },
      {
        "label": "sixteen",
        "value": 16,
      },
      {
        "label": "seventeen",
        "value": 17,
      },
      {
        "label": "eighteen",
        "value": 18,
      },
    ];

    // Shrink to possible bids from the above.
    result = result.slice(0, this.data.hand.cards.length - 1);

    if (this.data.config.with_nil) {
      result.push(
        {
          "label": "nil",
          "value": 19,
        }
      );
    }

    if (this.data.config.with_triple_nil) {
      result.push(
        {
          "label": "triple nil",
          "value": 21,
        }
      );
    }

    return result;
  }

  my_turn() {
    return +this.data.turn === +this.game.user.id;
  }

  async deal() {
    return this.controller.deal();
  }

  async decide(keep) {
    return this.controller.decide(keep);
  }

  async peek() {
    return this.controller.peek();
  }

  async bid(amount) {
    return this.controller.bid(amount);
  }

  async play(card) {
    return this.controller.play(card);
  }

  close() {
    this.controller.close();
  }
}

export {
  SpadesData,
  SpadesGame,
  SpadesController,
};
