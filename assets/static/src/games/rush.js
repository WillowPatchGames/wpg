import {
  LetterTile,
  LetterBank,
  LetterGrid
} from './word.js';

import {
  WebSocketController
} from './common.js';

class RushController {
  constructor(game) {
    this.game = game;
    this.draw_id = 1;

    this.wsController = new WebSocketController(this.game);
  }

  async admitPlayer(player, admit) {
    return await this.wsController.send({
      'message_type': 'admit',
      'target_id': +player,
      'admit': admit,
    });
  }

  async markReady(ready) {
    return await this.wsController.send({
      'message_type': 'ready',
      'ready': ready,
    });
  }

  async startGame() {
    return await this.wsController.send({
      'message_type': 'start',
    });
  }

  async check() {
    return await this.wsController.sendAndWait({
      'message_type': 'check',
    });
  }

  async draw() {
    return await this.wsController.sendAndWait({
      'message_type': 'draw',
      'draw_id': this.draw_id++,
    });
  }

  async discard(tile) {
    return await this.wsController.sendAndWait({
      'message_type': 'discard',
      'tile_id': tile.id,
    });
  }

  async recall(tile) {
    return await this.wsController.send({
      'message_type': 'recall',
      'tile_id': tile.id,
    });
  }

  async swap(first, second) {
    return await this.wsController.send({
      'message_type': 'swap',
      'first_id': first.id,
      'second_id': second.id,
    });
  }

  async move(tile, pos) {
    return await this.wsController.send({
      'message_type': 'move',
      'tile_id': tile.id,
      'x': pos.x,
      'y': pos.y,
    });
  }

  async play(tile, pos) {
    return await this.wsController.send({
      'message_type': 'play',
      'tile_id': tile.id,
      'x': pos.x,
      'y': pos.y,
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
}

class RushData {
  constructor(old) {
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

  // Set a tile at a given position.
  set(here, value) {
    if (this.get(here) === value) {
      return;
    }

    if (!value) {
      return this.delete(here);
    }

    if (here[0] === "grid") {
      return this.grid.set(...here.slice(1), value);
    } else if (here[0] === "bank") {
      return this.bank.set(...here.slice(1), value);
    } else {
      throw new Error("Unrecognized GameData location: " + here[0]);
    }
  }

  // Arbitrary data deleter for bank and grid using types.
  delete(here) {
    if (here instanceof LetterTile) {
      here = this.findById(here);
    }

    if (here === null || !this.get(here)) {
      return;
    }

    if (here[0] === "grid") {
      this.grid.delete(...here.shift());
    } else if (here[0] === "bank") {
      this.grid.delete(...here.shift());
    } else {
      throw new Error("Unknown type for RushData locations: " + here[0]);
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

  check(result) {
    // XXX: Determine what to do at the controller layer w.r.t. invalid words.
    console.log("Here?");
    console.log(result);
    return {};
  }

  draw(...tile) {
    this.bank.add(...tile);
  }

  discard(tile) {
    this.delete(tile);
  }

  recall(tile) {
    this.grid.delete(tile);
    this.draw(tile);
  }

  swap(first, second) {
    var here = this.findById(first);
    var there = this.findById(second);
    this.set(here, second);
    this.set(there, first);
  }

  move(tile, pos) {
    var old = this.findLetter(tile);
    this.set(pos, tile);
    this.delete(old);
  }

  play(tile, pos) {
    this.bank.delete(tile);
    this.set(pos, tile);
  }

  empty() {
    return this.grid.empty() && this.bank.empty();
  }

  letterPositions(bankFirst) {
    var grids = this.grid.letterPositions().map(l => (l.pos.unshift("grid"), l));
    var banks = this.bank.letterPositions().map(l => (l.pos.unshift("bank"), l));
    return [].concat(bankFirst ? banks : grids, bankFirst ? grids : banks);
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

class RushGame {
  constructor(game) {
    this.game = game;
    this.controller = new RushController(game);
    this.data = new RushData(game);

    this.controller.onMessage("state", (data) => { this.handleNewState(data) });
  }

  handleNewState(message) {
    console.log("Got new state pushed:", message);
    if (message.added !== undefined && message.added !== null) {
      if (message.added.hand !== undefined && message.added.hand !== null) {
        this.data.draw(...message.added.hand);
      }
    }
  }

  async check() {
    var ret = await this.controller.draw();
    if (ret.message_type === "error") {
      // return this.data.check(ret);
    }
  }

  async draw() {
    var ret = await this.controller.draw();
    if (ret.message_type !== "state") {
      // What to do?
    }
  }

  async discard(tile) {
    this.data.discard(tile);
    var ret = await this.controller.discard(tile);
    return this.data.draw(ret);
  }

  async recall(tile) {
    this.controller.recall(tile);
    return this.data.recall(tile);
  }

  async swap(first, second) {
    this.controller.swap(first, second);
    return this.data.recall(first, second);
  }

  async move(tile, pos) {
    this.controller.move(tile, pos);
    return this.data.move(tile, pos);
  }

  async play(tile, pos) {
    this.controller.move(tile, pos);
    return this.data.move(tile, pos);
  }
}

export {
  RushGame,
};
