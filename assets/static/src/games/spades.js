import {
  WebSocketController
} from './common.js';

class SpadesController {
  constructor(game) {
    this.game = game;
    this.draw_id = 1;
    this.remaining_tiles = 0;

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

  async peek() {
    return await this.wsController.send({
      'message_type': 'peek',
    });
  }

  onMessage(type, handler) {
    return this.wsController.onMessage(type, handler);
  }

  close() {
    this.wsController.close();
  }
}

class SpadesGame {
  constructor(game, readonly) {
    this.game = game;

    if (readonly === undefined || readonly === null || readonly === false) {
      this.controller = new SpadesController(game);
      this.controller.onMessage("state", (data) => { this.handleNewState(data) });
    }

    this.data = new SpadesData(game);

    this.started = false;

    this.onChange = () => {};
  }

  handleNewState(message) {
    this.controller.draw_id = Math.max(message.draw_id, this.controller.draw_id);
    this.controller.remaining_tiles = message.remaining;

    // If this message was in reply to another, ignore it. Don't process added
    // events to give draw/discard a chance to work.
    if (message.reply_to && message.reply_to !== 0) {
      return;
    }

    if (!this.started) {
      if (message.hand && this.data.bank.empty()) {
        this.data.bank = LetterBank.deserialize(message.hand);
      }

      if (message.board && this.data.grid.empty()) {
        this.data.grid = LetterGrid.deserialize(message.board);
      }
    } else {
      if (message.added !== undefined && message.added !== null) {
        if (message.added.hand !== undefined && message.added.hand !== null) {
          this.data.draw(...message.added.hand);
        }
      }

      // Now go through the hand and board and make sure every tile that the
      // server thinks is in the hand is at least present somewhere.
      if (message.hand) {
        for (let tile of message.hand) {
          var l_tile = LetterTile.deserialize(tile);
          if (this.data.positionOf(l_tile) === null) {
            this.data.draw(l_tile);
          }
        }
      }
    }

    // After the first state message, consider ourselves started and let the
    // reply rules apply.
    this.started = true;

    this.onChange(this);
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
