import {
  LetterTile,
  LetterBank,
  LetterGrid,
} from './games/word.js';

function def(v) {
  return v !== undefined && v !== null;
}

class GameData {
  add(...values) {
    for (let value of values) {
      if (this.findById(value)) continue;
      this.set(["bank", LetterBank.blank], value);
    }
    return this;
  }
  letterPoses(bankFirst) {
    var grids = this.grid.letterPoses().map(l => (l.pos.unshift("grid"), l));
    var banks = this.bank.letterPoses().map(l => (l.pos.unshift("bank"), l));
    return [].concat(bankFirst ? banks : grids, bankFirst ? grids : banks);
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
  WordManager,
  JSWordManager,
  GameInterface,
};
