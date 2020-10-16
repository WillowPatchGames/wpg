import {
  LetterTile,
  LetterPos,
  LetterBank,
  LetterGrid,
} from './word.js';

import {
  WebSocketController
} from './common.js';

class RushController {
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
    if (!(tile instanceof LetterTile)) {
      console.log("Garbage data passed to RushController.discard(): ", tile);
    }

    return await this.wsController.sendAndWait({
      'message_type': 'discard',
      'tile_id': tile.id,
    });
  }

  async recall(tile) {
    if (!(tile instanceof LetterTile)) {
      console.log("Garbage data passed to RushController.recall(): ", tile);
    }

    return await this.wsController.send({
      'message_type': 'recall',
      'tile_id': tile.id,
    });
  }

  async swap(first, second) {
    if (!(first instanceof LetterTile) || !(second instanceof LetterTile)) {
      console.log("Garbage data passed to RushController.swap(): ", first, second);
    }

    return await this.wsController.send({
      'message_type': 'swap',
      'first_id': first.id,
      'second_id': second.id,
    });
  }

  async move(tile, pos) {
    if (!(tile instanceof LetterTile) || !(pos instanceof LetterPos)) {
      console.log("Garbage data passed to RushController.move(): ", tile, pos);
    }

    return await this.wsController.send({
      'message_type': 'move',
      'tile_id': tile.id,
      'x': pos.x,
      'y': pos.y,
    });
  }

  async play(tile, pos) {
    if (!(tile instanceof LetterTile) || !(pos instanceof LetterPos)) {
      console.log("Garbage data passed to RushController.play(): ", tile, pos);
    }

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

  close() {
    this.wsController.close();
  }
}

class RushData {
  constructor(old) {
    // If the old grid and bank exist, copy them into a new LetterGrid
    // instance. We assume this happens recursively, i.e., that the result
    // of `new RushData(old)` results in a full deep copy.
    this.grid = old?.grid ? new LetterGrid(old.grid) : new LetterGrid();
    this.bank = old?.bank ? new LetterBank(old.bank) : new LetterBank();
    this.unwords = [];

    this.onAdd = (...tiles) => {};
  }

  // Arbitrary data grabber for bank and grid using types. Returns a LetterTile
  // instance.
  get(here) {
    if (here === null || here === undefined) {
      return null;
    }

    if (here.length === 1 && typeof here[0] === "number") {
      return this.get(["bank", +here[0]]);
    }

    if (here.length === 2 && typeof here[0] === "number" && typeof here[1] === "number") {
      return this.get(["grid", +here[0], +here[1]]);
    }

    var type = here[0];

    var ret = null;
    if (type === "tile" && here.length === 2) {
      ret = this.get(this.positionOf(here[1]));
    } else if (type === "grid" && here.length === 3) {
      ret = this.grid.get(here[1], here[2]);
    } else if (type === "bank" && here.length === 2) {
      ret = this.bank.get(here[1]);
    } else {
      console.log("Unknown type for RushData locations: ", here);
    }

    if (ret === undefined) {
      ret = null;
    }

    return ret;
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
      here = this.positionOf(here);
    }

    if (here === null || !this.get(here)) {
      console.log("Deleting failed because here was null or didn't exist in the game...");
      return;
    }

    if (here[0] === "grid") {
      here.shift();
      return this.grid.delete(...here);
    } else if (here[0] === "bank") {
      here.shift();
      return this.bank.delete(...here);
    } else {
      throw new Error("Unknown type for RushData locations: " + here[0]);
    }
  }

  // Find a letter by identifier.
  positionOf(obj) {
    var result = this.grid.findLetter(obj);
    if (result !== undefined && result !== null) {
      if (result[0] !== "grid") {
        result.unshift("grid");
      }

      return result;
    }

    result = this.bank.findLetter(obj);
    if (result !== undefined && result !== null) {
      if (result[0] !== "bank") {
        result.unshift("bank");
      }

      return result;
    }

    return null;
  }

  check(message) {
    this.unwords = [];

    if (message.unwords) {
      var words = this.grid.words();
      for (let word of words) {
        if (message.unwords.indexOf(String(word)) !== -1) {
          this.unwords.push(word);
        }
      }
    }

    return message.error ? message.error : null;
  }

  draw(...tiles) {
    this.bank.add(...tiles);
    this.onAdd(...tiles);
  }

  discard(tile) {
    this.delete(tile);
  }

  recall(tile) {
    var here = this.grid.findLetter(tile);
    this.grid.delete(...here.slice(1));
    this.draw(tile);
  }

  swap(first, second) {
    var here = this.positionOf(first);
    var there = this.positionOf(second);
    this.set(here, second);
    this.set(there, first);
  }

  move(tile, pos) {
    var old = this.positionOf(tile);
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
      grid: obj.board ? LetterGrid.deserialize(obj.board) : new LetterGrid(),
      bank: obj.hand ? LetterBank.deserialize(obj.hand) : new LetterBank(),
    });
  }
}

class RushGame {
  constructor(game, readonly) {
    this.game = game;

    if (readonly === undefined || readonly === null || readonly === false) {
      this.controller = new RushController(game);
      this.controller.onMessage("state", (data) => { this.handleNewState(data) });
    }

    this.data = new RushData(game);

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
    }

    // After the first state message, consider ourselves started and let the
    // reply rules apply.
    this.started = true;

    this.onChange(this);
  }

  async check() {
    var ret = await this.controller.check();
    return this.data.check(ret);
  }

  async draw() {
    var ret = await this.controller.draw();
    if (ret.message_type === "error") {
      await this.check();
      return ret;
    }

    if (ret.added !== undefined && ret.added !== null) {
      if (ret.added.hand !== undefined && ret.added.hand !== null) {
        this.data.draw(...ret.added.hand);
      }
    }
  }

  async discard(tile) {
    this.data.discard(tile);

    var ret = await this.controller.discard(tile);
    if (ret.message_type && ret.message_type === "state" && ret.added && ret.added.hand) {
      this.data.draw(...ret.added.hand);
    } else {
      this.data.draw(tile);
    }

    return ret;
  }

  async recall(tile) {
    this.controller.recall(tile);
    return this.data.recall(tile);
  }

  async swap(first, second) {
    var ret = this.data.swap(first, second);
    this.controller.swap(first, second);
    return ret;
  }

  async move(tile, pos) {
    var tile_pos = new LetterPos(pos[1] - this.data.grid.drift[0], pos[2] - this.data.grid.drift[1]);
    var ret = this.data.move(tile, pos);
    this.controller.move(tile, tile_pos);
    return ret;
  }

  async play(tile, pos) {
    var tile_pos = new LetterPos(pos[1] - this.data.grid.drift[0], pos[2] - this.data.grid.drift[1]);

    var ret = this.data.play(tile, pos);
    this.controller.play(tile, tile_pos);
    return ret;
  }

  close() {
    this.controller.close();
  }
}

export {
  RushData,
  RushGame,
};
