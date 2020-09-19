import {
  LetterTile,
  LetterBank,
  LetterGrid
} from './word.js';

import {
  WebSocketController
} from './common.js';

class RushInterface {
  drawTile = () => {};
  discard = (tile) => {};
  recall = (tile) => {};
  swap = (first, second) => {};
  move = (tile, pos) => {};
  play = (tile, pos) => {};
}

class RushController extends RushInterface {
  constructor(game) {
    super();

    this.game = game;
    this.draw_id = 1;

    this.wsController = new WebSocketController(this.game);
  }

  async admitPlayer(player, admit) {
    return this.game.wsController.send({
      'message_type': 'admit',
      'target_id': +player,
      'admit': admit,
    });
  }

  async markReady(ready) {
    return this.game.wsController.send({
      'message_type': 'ready',
      'ready': ready,
    });
  }

  async startGame() {
    return this.game.wsController.send({
      'message_type': 'start',
    });
  }

  async drawTile() {
    return this.game.wsController.sendAndWait({
      'message_type': 'draw',
      'draw_id': this.draw_id++,
    });
  }

  async discard(tile) {
    return this.game.wsController.sendAndWait({
      'message_type': 'discard',
      'tile_id': tile.id,
    });
  }

  async recall(tile) {
    return this.game.wsController.send({
      'message_type': 'recall',
      'tile_id': tile.id,
    });
  }

  async swap(first, second) {
    return this.game.wsController.send({
      'message_type': 'swap',
      'first_id': first.id,
      'second_id': second.id,
    });
  }

  async move(tile, pos) {
    return this.game.wsController.send({
      'message_type': 'move',
      'tile_id': tile.id,
      'x': pos.x,
      'y': pos.y,
    });
  }

  async play(tile, pos) {
    return this.game.wsController.send({
      'message_type': 'play',
      'tile_id': tile.id,
      'x': pos.x,
      'y': pos.y,
    });
  }
}

class RushData extends RushInterface {
  constructor(old) {
    super();

    // If the old grid and bank exist, copy them into a new LetterGrid
    // instance. We assume this happens recursively, i.e., that the result
    // of `new RushData(old)` results in a full deep copy.
    this.grid = old?.grid ? new LetterGrid(old.grid) : new LetterGrid();
    this.bank = old?.bank ? new LetterBank(old.bank) : new LetterBank();
  }

  // Arbitrary data grabber for bank and grid using types.
  get(type, ...indices) {
    if (type === "grid") {
      return this.grid.get(...indices);
    } else if (type === "bank") {
      return this.bank.get(...indices);
    } else {
      throw new Error("Unknown type for RushData locations: " + type);
    }
  }

  // Find a letter by identifier.
  findById(obj) {
    var result = this.grid.findLetter(obj);
    if (result !== null) {
      return result.unpush("grid");
    }

    result = this.bank.findLetter(obj);
    if (result !== null) {
      return result.unpush("bank");
    }

    return null;
  }

  // Arbitrary data deleter for bank and grid using types.
  delete(here) {
    if (here instanceof LetterTile) {
      here = this.findById(here);
    }
  }

  // Serialize RushData for sending back over the WebSocket to the server.
  serialize() {
    return {
      'board': this.grid.serialize(),
      'hand': this.hand.serialize(),
    };
  }

  // Deserialize RushData we got from the server.
  static deserialize(obj) {
    return new RushData({
      grid: LetterGrid.deserialize(obj.board),
      bank: LetterBank.deserialize(obj.hand),
    });
  }
}

class RushGame extends RushInterface {
  constructor(game) {
    super();

    this.game = game;
    this.data = new RushData(game);
    this.controller = new RushController(game);
  }


}

export {
  RushGame,
};
