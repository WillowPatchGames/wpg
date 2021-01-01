import {
  WebSocketController
} from './common.js';

import {
  UserCache
} from '../utils/cache.js';

import {
  CardHand,
  Card,
} from './card.js';

class ThreeThirteenController {
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

  async takeDiscard() {
    return await this.wsController.sendAndWait({
      'message_type': 'take',
      'from_discard': true,
    });
  }

  async takeTop() {
    return await this.wsController.sendAndWait({
      'message_type': 'take',
      'from_discard': false,
    });
  }

  async discard(card, out) {
    return await this.wsController.sendAndWait({
      'message_type': 'discard',
      'card_id': card,
      'laying_down': out,
    });
  }

  async score(amount) {
    return await this.wsController.send({
      'message_type': 'score',
      'score': +amount,
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
class ThreeThirteenData {
  constructor(game, hand, drawn, picked_up_discard, round_score, score, turn, dealer, discard, round, config) {
    this.game = game;

    this.hand = hand;
    this.drawn = drawn;
    this.picked_up_discard = picked_up_discard;

    this.round_score = round_score;
    this.score = score;

    this.turn = turn;
    this.dealer = dealer;

    this.discard = discard;
    this.round = round;

    this.config = config;
  }
}

class ThreeThirteenGame {
  constructor(game, readonly) {
    this.game = game;

    if (readonly === undefined || readonly === null || readonly === false) {
      this.controller = new ThreeThirteenController(game);
      this.controller.onMessage("state", (data) => { this.handleNewState(data) });
      this.controller.onMessage("synopsis", (data) => { this.handleNewSynopsis(data) });
    }

    this.data = new ThreeThirteenData(game);
    this.synopsis = {};

    this.started = false;
    this.dealt = false;
    this.laid_down = false;
    this.laid_down_user = null;
    this.finished = false;

    this.onChange = () => {};
  }

  async handleNewState(message) {
    // Three Thirteen is a simpler game than Rush. We can always take the hand
    // from the server as this is a turn-based game. We won't get out of sync
    // like Rush.

    // Update some metadata about game progress.
    this.started = message.started;
    this.dealt = message.dealt;
    this.laid_down = message.laid_down;
    this.laid_down_id = message.laid_down_id;
    this.finished = message.finished;

    if (this.laid_down) {
      this.laid_down_user = await UserCache.FromId(this.laid_down_id);
    }

    // Then update the main data object.
    this.data.hand = message?.hand ? CardHand.deserialize(message.hand) : null;
    if (this.data.hand != null) {
      this.data.hand.cardSort(false, false);
    }
    this.data.drawn = message?.drawn ? Card.deserialize(message.drawn) : null;
    this.data.picked_up_discard = message?.picked_up_discard;
    this.data.round_score = message?.round_score;
    this.data.score = message?.score;
    this.data.turn = message?.turn;
    this.data.dealer = message?.dealer;
    this.data.discard = message?.discard ? CardHand.deserialize(message.discard) : null;
    this.data.round = message?.round;
    this.data.config = message?.config;

    this.onChange(this);
  }

  async handleNewSynopsis(message) {
    if (message.players) {
      for (let player of message.players) {
        player.user = await UserCache.FromId(player.user);
        player.has_laid_down = (+player.user.id === +this.laid_down_id);
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

  async takeDiscard() {
    return this.controller.takeDiscard();
  }

  async takeTop() {
    return this.controller.takeTop();
  }

  async discard(card, out) {
    return this.controller.discard(card, out);
  }

  async score(amount) {
    if (amount !== null && amount !== undefined) {
      return this.controller.score(amount);
    }
  }
}

export {
  ThreeThirteenGame,
};
