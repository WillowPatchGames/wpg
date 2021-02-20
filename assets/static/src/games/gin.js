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

class GinController {
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
    let msg = {
      'message_type': 'discard',
      'laying_down': out,
    };
    if (card) {
      msg.card_id = card;
    } else {
      msg.card_id = -1;
    }
    return await this.wsController.sendAndWait(msg);
  }

  async sort(order) {
    return await this.wsController.sendAndWait({
      'message_type': 'sort',
      'order': order,
    });
  }

  async score(amount) {
    return await this.wsController.sendAndWait({
      'message_type': 'score',
      'score': +amount,
    });
  }

  async score_by_groups(groups, leftover) {
    return await this.wsController.sendAndWait({
      'message_type': 'score_by_groups',
      'groups': groups,
      'leftover': leftover,
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
class GinData {
  constructor(game) {
    this.game = game;
    this.hand = new CardHand([]);
  }
}

class GinGame {
  constructor(game, readonly) {
    this.game = game;

    if (readonly === undefined || readonly === null || readonly === false) {
      this.controller = new GinController(game);
      this.controller.onMessage("state", (data) => { this.handleNewState(data) });
      this.controller.onMessage("synopsis", (data) => { this.handleNewSynopsis(data) });
    }

    this.data = new GinData(game);
    this.synopsis = {};

    this.started = false;
    this.dealt = false;
    this.laid_down = false;
    this.laid_down_user = null;
    this.finished = false;

    this.onChange = () => {};
  }

  async handleNewState(message) {
    // Gin is a simpler game than Rush. We can always take the hand from the
    // server as this is a turn-based game. We won't get out of sync like Rush.

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
    var newHand = message.hand && CardHand.deserialize(message.hand);
    this.data.hand.setCardsTo(newHand);
    this.data.drawn = message?.drawn ? Card.deserialize(message.drawn) : null;
    this.data.picked_up_discard = message?.picked_up_discard;
    this.data.round_score = message?.round_score;
    this.data.score = message?.score;
    this.data.turn = message?.turn;
    this.data.dealer = message?.dealer;
    this.data.discard = message?.discard ? CardHand.deserialize(message.discard) : null;
    this.data.config = message?.config;
    if (this.data.config) {
      this.game.config = this.data.config;
    }

    this.onChange(this);
  }

  async handleNewSynopsis(message) {
    if (message.players) {
      for (let player of message.players) {
        player.user = await UserCache.FromId(player.user);
        player.has_laid_down = (+player.user.id === +this.laid_down_id);
        player.hand = player?.hand ? CardHand.deserialize(player.hand) : null;
        if (player.hand) {
          player.hand.cardSort(false, false);
        }
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

  async sort(order) {
    this.data.hand.sortToFront(order);
    return this.controller.sort(this.data.hand.cards.map(card => card.id));
  }

  async score(amount) {
    return this.controller.score(amount);
  }

  async score_by_groups(groups, leftover) {
    return this.controller.score_by_groups(groups, leftover);
  }

  close() {
    this.controller.close();
  }
}

export {
  GinGame,
};
