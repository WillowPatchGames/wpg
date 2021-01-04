import {
  WebSocketController
} from './common.js';

import {
  UserCache
} from '../utils/cache.js';

import {
  CardHand,
} from './card.js';

class HeartsController {
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

  async pass(cards) {
    return await this.wsController.sendAndWait({
      'message_type': 'pass',
      'to_pass': cards,
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
class HeartsData {
  constructor(game) {
    this.game = game;
  }
}

class HeartsGame {
  constructor(game, readonly) {
    this.game = game;

    if (readonly === undefined || readonly === null || readonly === false) {
      this.controller = new HeartsController(game);
      this.controller.onMessage("state", (data) => { this.handleNewState(data) });
      this.controller.onMessage("synopsis", (data) => { this.handleNewSynopsis(data) });
    }

    this.data = new HeartsData(game);
    this.synopsis = {};

    this.started = false;
    this.dealt = false;
    this.passed = false;
    this.finished = false;

    this.onChange = () => {};
  }

  async handleNewState(message) {
    // Hearts is a simpler game than Rush. We can always take the hand from the
    // server as this is a turn-based game. We won't get out of sync like Rush.

    // Update some metadata about game progress.
    this.started = message.started;
    this.dealt = message.dealt;
    this.passed = message.passed;
    this.finished = message.finished;

    // Then update the main data object.
    this.data.hand = message?.hand ? CardHand.deserialize(message.hand) : null;
    if (this.data.hand != null) {
      this.data.hand.cardSort(true, true);
    }
    this.data.have_passed = message?.have_passed;
    this.data.incoming = message?.incoming ? CardHand.deserialize(message.incoming) : null;
    if (this.data.incoming != null) {
      this.data.incoming.cardSort(true, true);
    }
    this.data.tricks = message?.tricks;
    this.data.round_score = message?.round_score;
    this.data.score = message?.score;
    this.data.turn = message?.turn;
    this.data.leader = message?.leader;
    this.data.dealer = message?.dealer;
    this.data.pass_direction = message?.pass_direction;
    this.data.played = message?.played ? CardHand.deserialize(message.played) : null;
    this.data.hearts_broken = message?.hearts_broken;
    this.data.history = message?.history ? message.history.map(CardHand.deserialize) : null;
    this.data.crib = message?.crib ? CardHand.deserialize(message.crib) : null;
    if (this.data.crib !== null) {
      this.data.crib.cardSort(true, true);
    }
    this.data.config = message?.config;

    // We've gotta sync up who_played with our played data.
    if (!this.data.who_played || (message.who_played && message.played.length === 1 && +this.data.who_played[0].id !== +message.who_played[0])) {
      this.data.who_played = [];
      for (let uid of message.who_played) {
        let player = await UserCache.FromId(uid);
        this.data.who_played.push(player);
      }
    }

    this.onChange(this);
  }

  async handleNewSynopsis(message) {
    // Hearts is a simpler game than Rush. We can always take the hand from the
    // server as this is a turn-based game. We won't get out of sync like Rush.
    if (message.players) {
      for (let player of message.players) {
        player.user = await UserCache.FromId(player.user);
      }
    }
    Object.assign(this.synopsis, message);

    this.onChange(this);
  }

  my_turn() {
    return +this.data.turn === +this.game.user.id;
  }

  async deal() {
    return this.controller.deal();
  }

  async pass(cards) {
    return this.controller.pass(cards);
  }

  async play(card) {
    return this.controller.play(card);
  }

  close() {
    this.controller.close();
  }
}

export {
  HeartsData,
  HeartsGame,
  HeartsController,
};
