import {
  LetterTile,
  LetterBank,
  LetterGrid,
} from './games/word.js';

function def(v) {
  return v !== undefined && v !== null;
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

export {
  WordManager,
  JSWordManager,
};
