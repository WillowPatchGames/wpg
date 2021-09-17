import {
  GameController,
} from './common.js';

import {
  UserCache
} from '../utils/cache.js';

import {
  CardHand,
} from './card.js';

class EightJacksController extends GameController {
  async assignTeams(team_data) {
    return await this.wsController.sendAndWait({
      'message_type': 'assign',
      ...team_data,
    });
  }

  async discard(card) {
    return await this.wsController.send({
      'message_type': 'discard',
      'card_id': +card,
    });
  }

  async play(card, square) {
    return await this.wsController.send({
      'message_type': 'play',
      'card_id': +card,
      'square_id': +square,
    });
  }

  async mark(squares) {
    return await this.wsController.send({
      'message_type': 'mark',
      'squares': squares.map(square => +square),
    });
  }

  async sort(order) {
    return await this.wsController.sendAndWait({
      'message_type': 'sort',
      'order': order,
    });
  }

  async select(square) {
    return await this.wsController.send({
      'message_type': 'select',
      'square_id': +square,
    });
  }
}

// Unlike Rush, where we have to duplicate logic on the client and server to
// move and drop tiles &c, here we can lazily take values from the server and
// blindly update ours. This is because we only do a single action at a time,
// and unless there's a network glitch (in which case server wins anyways),
// the data always aligns after the message is confirmed by the server.
class EightJacksData {
  constructor(game) {
    this.game = game;
    this.hand = new CardHand([]);
  }
}

class EightJacksGame {
  constructor(game, readonly) {
    this.game = game;

    if (readonly === undefined || readonly === null || readonly === false) {
      this.controller = new EightJacksController(game);
      this.controller.onMessage("state", (data) => { this.handleNewState(data) });
      this.controller.onMessage("game-state", (data) => { this.handleNewState(data) });
      this.controller.onMessage("synopsis", (data) => { this.handleNewSynopsis(data) });
    }

    this.data = new EightJacksData(game);
    this.synopsis = {};

    this.started = false;
    this.dealt = false;
    this.finished = false;

    this.onChange = () => {};

    this.hasTeams = true;
  }

  async handleNewState(message) {
    // EightJacks is a simpler game than Rush. We can always take the hand from the
    // server as this is a turn-based game. We won't get out of sync like Rush.

    // Update some metadata about game progress.
    this.started = message.started;
    this.dealt = message.dealt;
    this.finished = message.finished;

    // Then update the main data object.
    var newHand = message.hand && CardHand.deserialize(message.hand);
    this.data.hand.setCardsTo(newHand);
    this.data.global_history = message.global_history && CardHand.deserialize(message.global_history);
    this.data.score = message?.score;
    this.data.turn = message?.turn;
    this.data.dealer = message?.dealer;
    this.data.history = message?.history ? CardHand.deserialize(message.history) : null;
    this.data.discards = message?.discards ? CardHand.deserialize(message.discards) : null;
    this.data.config = message?.config;
    if (this.data.config) {
      this.game.config = this.data.config;
    }
    this.data.board = message?.board;
    this.data.players = message?.players;
    this.data.selected_square = message?.selected_square;
    this.data.selected_square_uid = message?.selected_square_uid;
    this.data.selected_square_sid = message?.selected_square_sid;
    this.data.turn = await UserCache.FromId(message?.turn);

    this.onChange(this);
  }

  async handleNewSynopsis(message) {
    if (message.players) {
      for (let player of message.players) {
        player.user = await UserCache.FromId(player.user);
      }
    }
    Object.assign(this.synopsis, message);

    this.onChange(this);
  }

  my_turn() {
    return +this.data.turn === +this.game.user.id || +this.data.turn?.id === +this.game.user.id;
  }

  async peek() {
    return this.controller.peek();
  }

  async discard(card) {
    return this.controller.discard(card);
  }

  async play(card, square) {
    return this.controller.play(card, square);
  }

  async mark(squares) {
    return this.controller.mark(squares);
  }

  async sort(order) {
    this.data.hand.sortToFront(order);
    return this.controller.sort(this.data.hand.cards.map(card => card.id));
  }

  close() {
    this.controller.close();
    this.onChange = (e) => { return true };
  }
}

export {
  EightJacksData,
  EightJacksGame,
  EightJacksController,
};
