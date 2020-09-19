import {
  LetterTile,
  LetterBank,
  LetterGrid,
} from './games/word.js';

function def(v) {
  return v !== undefined && v !== null;
}

class GameData {
  constructor(old) {
    this.grid = old?.grid ? new LetterGrid(old.grid) : new LetterGrid();
    this.bank = old?.bank ? new LetterBank(old.bank) : new LetterBank();
  }
  serialize() {
    var letters = [];
    this.letterPoses().forEach(({ letter, pos }) => {
      letters.push({
        letter: {
          id: letter.id,
          value: String(letter),
        },
        pos: {
          area: pos[0],
          idx: pos.slice(1).map(Number),
        }
      });
    });
    return letters;
  }
  static deserialize(letters) {
    var grids = [], banks = [];
    for (let letter of letters) {
      if (letter.pos.area === "grid") {
        grids.push({ letter: letter.letter, pos: letter.pos.idx });
      } else if (letter.pos.area === "bank") {
        banks.push({ letter: letter.letter, pos: letter.pos.idx });
      }
    }
    return new GameData({
      grid: LetterGrid.deserialize(grids),
      bank: LetterBank.deserialize(banks),
    });
  }
  get(here) {
    if (here[0] === "grid") {
      return this.grid.get(...here.slice(1));
    } else if (here[0] === "bank") {
      return this.bank.get(...here.slice(1));
    } else {
      throw new Error("Unrecognized GameData location: " + here[0]);
    }
  }
  delete(here) {
    if (here instanceof LetterTile) {
      here = this.findById(here);
    }
    if (!here || !this.get(here)) {
      return;
    }
    if (here[0] === "grid") {
      return this.grid.delete(...here.slice(1));
    } else if (here[0] === "bank") {
      return this.bank.delete(...here.slice(1));
    } else {
      throw new Error("Unrecognized GameData location: " + here[0]);
    }
  }
  set(here, value) {
    if (this.get(here) === value) {
      return;
    }
    if (!value) {
      return this.delete(here);
    }
    if (here[0] === "grid") {
      return this.grid.set(...here.slice(1), value) && this;
    } else if (here[0] === "bank") {
      return this.bank.set(...here.slice(1), value) && this;
    } else {
      throw new Error("Unrecognized GameData location: " + here[0]);
    }
  }
  add(...values) {
    for (let value of values) {
      if (this.findById(value)) continue;
      this.set(["bank", LetterBank.blank], value);
    }
    return this;
  }
  swap(here, there) {
    var h = this.get(here);
    var t = this.get(there);
    this.set(there, h);
    this.set(here, t);
    return this;
  }
  recall(here) {
    return this.swap(here, ["bank", LetterBank.blank]);
  }
  findById(letter) {
    var results = [];
    for (let row in this.grid.data) {
      for (let col in this.grid.data[row]) {
        let here = ["grid",+row,+col];
        if (this.get(here)?.id === letter.id) {
          results.push(here);
        }
      }
    }
    for (let i in this.bank) {
      let here = ["bank",+i];
      if (this.get(here)?.id === letter.id) {
        results.push(here);
      }
    }
    if (results.length === 1) {
      return results[0];
    }
    if (results.length !== 0) {
      console.error("Too many instances of letter in game data", results, letter);
    }
  }
  empty() {
    return this.grid.empty() && this.bank.empty();
  }
  letterPoses(bankFirst) {
    var grids = this.grid.letterPoses().map(l => (l.pos.unshift("grid"), l));
    var banks = this.bank.letterPoses().map(l => (l.pos.unshift("bank"), l));
    return [].concat(bankFirst ? banks : grids, bankFirst ? grids : banks);
  }
}

class TileManager {
  cancel() {}
  async draw() {}
  async discard(letter) {}
  swap(here, there) {}
}

class APITileManager extends TileManager {
  constructor(controller) {
    super();

    this.controller = controller;
    this.handler = this.handler.bind(this);
    this.conn.addEventListener("message", this.handler);
    this.draw_number = 1;
  }
  cancel() {
    //this.conn.removeEventListener("message", this.handler);
  }
  handler({ data: buf }) {
    var data = JSON.parse(buf);
    if (!data) return;
    if ((data.type === "draw" || data.type === "gamestart") && !data.request && this.onAdd) {
      let letters = data.letters.map(LetterTile.deserialize);
      if (data.draw_number) {
        this.draw_number = +data.draw_number + 1;
      }
      this.onAdd(...letters);
    }
  }

  async draw(data) {
    // XXX: Make this work.
    var dat = await this.controller.draw();
  }

  async discard(letter) {
    // XXX: Make this work.
    var dat = await this.controller.discard(letter);
  }

  async swap(here, there) {
    // XXX: Make this work.
    await this.controller.swap(here, there);
  }
}

class JSTileManager extends TileManager {
  constructor(length) {
    super();
    if (!def(length)) length = 50;
    // https://norvig.com/mayzner.html
    this.letterfreq = {
      "A": 8.04,
      "B": 1.48,
      "C": 3.34,
      "D": 3.82,
      "E": 12.49,
      "F": 2.40,
      "G": 1.87,
      "H": 5.05,
      "I": 7.57,
      "J": 0.16,
      "K": 0.54,
      "L": 4.07,
      "M": 2.51,
      "N": 7.23,
      "O": 7.64,
      "P": 2.14,
      "Q": 0.12,
      "R": 6.28,
      "S": 6.51,
      "T": 9.28,
      "U": 2.73,
      "V": 1.05,
      "W": 1.68,
      "X": 0.23,
      "Y": 1.66,
      "Z": 0.09,
    };
    this.drawpile = [];
    this.draw_size = 1;
    this.discard_penalty = 3;
    for (var i=0; i<length; i++) {
      this.drawpile.push(this.randomLetter());
    }
  }
  async draw() {
    if (this.drawpile.length < this.draw_size) return;
    var drawn = this.drawpile.splice(0, this.draw_size);
    return drawn;
  }
  async discard(letter) {
    if (this.drawpile.length < this.discard_penalty) return;
    var drawn = this.drawpile.splice(0, this.discard_penalty);
    this.drawpile.push(letter);
    // shuffle
    for (let i = this.drawpile.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.drawpile[i], this.drawpile[j]] = [this.drawpile[j], this.drawpile[i]];
    }
    return drawn;
  }
  randomLetter() {
    var sum = 0;
    var letters = Object.keys(this.letterfreq);
    var bias = Object.values(this.letterfreq);
    var cumulativeBias = bias.map(function(x) { sum += x; return sum; });
    var choice = Math.random() * sum;
    var chosenIndex = null;
    cumulativeBias.some(function(el, i) {
        return el > choice ? ((chosenIndex = i), true) : false;
    });
    var chosenElement = letters[chosenIndex];
    return new LetterTile(chosenElement);
  }
}

class WordManager {
  cancel() {}
  async check(words) {}
}

class JSWordManager extends WordManager {
  constructor() {
    super();
    this.words = [];
    this.loading = null;
  }
  async check(words, stringify) {
    if (!stringify) stringify = String;
    if (this.loading) await this.loading;
    return words.filter(w => !this.words.includes(stringify(w)));
  }
  async fromURL(url) {
    this.loading = (async () => {
      return this.setWords(await (await fetch(url)).text());
    })();
    return this.loading;
  }
  setWords(words) {
    if (typeof words === "string") words = [words];
    this.words = words
      .flatMap(w => w.split("\n"))
      .flatMap(w => w.split(","))
      .flatMap(w => w.split(";"))
      .map(w => w.trim())
      .filter(w => {let n = Number(w); return Number.isNaN(n)})
      ;
    this.loading = null;
  }
}

class GameInterface extends GameData {
  constructor(old) {
    super(old);
    if (def(old?.tiles)) {
      this.tiles = old.tiles;
      this.tiles.onAdd = (...tiles) => this.add(...tiles);
      this.tiles.onDelete = (...tiles) => this.delete(...tiles);
    }
    if (def(old?.words)) {
      this.words = old.words;
    }
    this.history = [];
    if (!this.empty()) {
      this.history.push({
        type: "init",
        snapshot: {
          grid: new LetterGrid(this.grid),
          bank: new LetterBank(this.bank),
        },
      });
    }
  }

  cancel() {
    if (this.tiles) this.tiles.cancel();
    if (this.words) this.words.cancel();
  }

  swap(here, there) {
    super.swap(here, there);
    this.tiles.swap(here, there, this);
  }
  async draw() {
    let letters = await this.tiles.draw(this);
    if (letters) {
      this.add(...letters);
    }
    return letters;
  }
  async discard(where) {
    var letter = this.get(where);
    if (!letter) return null;
    this.swap(where, ["bank",""]);
    var added = await this.tiles.discard(letter, this);
    if (!added) return;
    this.delete(letter);
    this.add(...added);
    return added;
  }
  async check() {
    return this.words.check(this.grid.words());
  }
}

export {
  GameData,
  TileManager,
  APITileManager,
  JSTileManager,
  WordManager,
  JSWordManager,
  GameInterface,
};
