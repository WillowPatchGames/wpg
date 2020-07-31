function def(v) {
  return v !== undefined && v !== null;
}

class Letter extends String {
  constructor(value, id) {
    super(value);
    if (!def(id)) this.id = Letter.id++;
    else this.id = id;
  }
}
Letter.id = 1;

class GameData {
  constructor(old) {
    this.grid = new Grid(old?.grid);
    this.bank = new Bank(old?.bank);
  }
  get(here) {
    if (here[0] === "grid") {
      return this.grid.get(here[1]);
    } else if (here[0] === "bank") {
      return this.bank.get(here[1]);
    } else {
      throw new Error("Unrecognized GameData location: " + here[0]);
    }
  }
  delete(here) {
    if (!this.get(here)) {
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
      this.set(["bank",Bank.blank], value);
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
    return this.swap(here, ["bank",Bank.blank]);
  }
}

class TileManager {
  async draw(n) {

  }
  async discard(letter) {

  }
}

class APITileManager extends TileManager {
  constructor(conn) {
    super();
    this.conn = conn;
    this.handler = this.handler.bind(this);
    conn.addEventListener("message", this.handler);
  }
  handler({ data: buf }) {
    var data = JSON.parse(buf);
    if (!data) return;
    if (data.type === "add" && this.onAdd) {
      var letters = data.letters.map(l => new Letter(l.value, l.id));
      this.onAdd(...letters);
    }
  }
  async draw(n) {
    if (n === 0) return;
    if (!this.conn.readyState) {
      await new Promise((resolve, reject) => {
        let clean = () => {
          this.conn.removeEventListener("open", good);
          this.conn.removeEventListener("close", bad);
          this.conn.removeEventListener("error", bad);
        }
        let good = (e) => {
          resolve(e);
          clean();
        }
        let bad = (e) => {
          reject(e);
          clean();
        }
        this.conn.addEventListener("open", good);
        this.conn.addEventListener("close", bad);
        this.conn.addEventListener("error", bad);
      });
    }
    this.conn.send(JSON.stringify({
      type: "draw",
      n
    }));
    return;
  }
  async discard(letter) {
    this.conn.send(JSON.stringify({
      type: "discard",
      letter: {
        id: letter.id,
        value: String(letter),
      },
    }));
    return;
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
    for (var i=0; i<length; i++) {
      this.drawpile.push(this.randomLetter());
    }
  }
  async draw(n) {
    if (n === 0) return;
    var a = true;
    if (!def(n)) { n = 1; a = false; }
    if (this.drawpile.length < n) return;
    var drawn = this.drawpile.splice(0, n);
    return a ? drawn : drawn[0];
  }
  async discard(letter) {
    if (this.drawpile.length < 3) return;
    var drawn = this.drawpile.splice(0, 3);
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
    return new Letter(chosenElement);
  }
}

class WordManager {
  async check(words) {
  }
}

class JSWordManager extends WordManager {
  constructor() {
    super();
    this.words = [];
  }
  async check(words, stringify) {
    if (!stringify) stringify = String;
    return words.filter(w => !this.words.includes(stringify(w)));
  }
  async fromURL(url) {
    this.setWords(await (await fetch(url)).text());
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
  }
}

class GameInterface extends GameData {
  constructor(old) {
    super(old);
    if (def(old?.tiles)) {
      this.tiles = old.tiles;
      this.tiles.onAdd = (...tiles) => this.add(...tiles);
    }
    if (def(old?.words)) {
      this.words = old.words;
    }
  }
  async draw(n) {
    let letters = await this.tiles.draw(n);
    if (letters) {
      if (def(n)) {
        this.add(...letters);
      } else {
        this.add(letters);
      }
    }
    return letters;
  }
  async discard(where) {
    var letter = this.get(where);
    if (!letter) return null;
    var added = await this.tiles.discard(letter);
    if (!added) return;
    this.delete(where);
    this.add(...added);
    return added;
  }
  async check() {
    return this.words.check(this.grid.words());
  }
}

class Bank extends Array {
  constructor(...arg) {
    if (arg.length === 1 && (arg[0] instanceof Bank || arg[0] instanceof Array)) {
      super(...arg[0]);
    } else {
      super(...arg);
    }
  }
  get(here) {
    return this[here];
  }
  set(here, value) {
    if (here === Bank.blank) {
      return this.add(value);
    } else {
      this[here] = value;
      return this;
    }
  }
  add(...values) {
    this.push(...values);
    return this;
  }
  delete(here) {
    if (here === Bank.blank) return;
    this.splice(here, 1);
    return this;
  }
}
Bank.blank = "";

class Grid {
  constructor(old) {
    if (old?.data) {
      this.data = old.data;
    } else {
      this.data = [];
    }
    if (old?.drift) {
      this.drift = [old.drift[0], old.drift[1]];
    } else {
      this.drift = [0,0];
    }
  }
  get rows() {
    return this.data.length;
  }
  set rows(len) {
    this.data.length = len;
    for (let i = 0; i < len; i++) {
      if (!this.data[i]) {
        this.data[i] = [];
      }
    }
    this.cols = (null, this.cols);
  }
  get cols() {
    var res = 0;
    for (let row in this.data) {
      if (this.data[row].length > res) {
        res = this.data[row].length;
      }
    }
    return res;
  }
  set cols(len) {
    for (let row in this.data) {
      this.data[row].length = len;
    }
  }
  get(row, col) {
    return this.data[row] && this.data[row][col];
  }
  set(row, col, value) {
    if (!value) this.delete(row, col);
    if (!this.data[row]) this.data[row] = [];
    this.data[row][col] = value;
    return this;
  }
  delete(row, col) {
    delete this.data[row][col];
    return this;
  }
  writeWord(word, row, col, vert, cons) {
    for (let letter of word) {
      if (!this.data[row]) this.data[row] = [];
      this.data[row][col] = cons ? new cons(letter) : cons;
      if (vert) {
        row += 1;
      } else {
        col += 1;
      }
    }
    this.rows = (null, this.rows);
  }
  padding(amt) {
    if (!amt) amt = 0;
    if (typeof amt === "number") {
      amt = [amt, amt];
    } else {
      amt[0] = +amt[0];
      amt[1] = +amt[1];
    }
    if (amt[0] < 0) amt[0] = 0;
    if (amt[1] < 0) amt[1] = 0;

    var i = this.rows, I = 0, j = this.cols, J = 0;
    var empty = true;
    for (let row in this.data) {
      for (let col in this.data[row]) {
        if (this.data[row][col]) {
          empty = false;
          i = Math.min(i, +row); I = Math.max(I, +row+1);
          j = Math.min(j, +col); J = Math.max(J, +col+1);
        }
      }
    }

    if (empty) {
      this.rows = amt[0];
      this.cols = amt[1];
    } else {
      var more = [];
      for (let row in this.data) {
        more.length = Math.max(0, amt[1] - j);
        this.data[row].splice(0, Math.max(0, j - amt[1]), ...more);
      }
      more.length = Math.max(0, amt[0] - i);
      this.data.splice(0, Math.max(0, i - amt[0]), ...more);
      this.rows = (I - i) + amt[0] + amt[0];
      this.cols = (J - j) + amt[1] + amt[1];
    }

    this.drift[0] += amt[0] - i;
    this.drift[1] += amt[1] - j;
    return [amt[0] - i, amt[1] - j];
  }
  components() {
    var components = [];
    for (let row in this.data) {
      for (let col in this.data[row]) {
        if (!this.data[row][col]) continue;
        var u = components.findIndex(c => c[row-1]?.[col]);
        var l = components.findIndex(c => c[row]?.[col-1]);
        if (u >= 0 && l >= 0 && u !== l) {
          for (let i in components[l]) {
            if (!components[u][i]) components[u][i] = {};
            for (let j in components[l][i]) {
              components[u][i][j] = components[l][i][j];
            }
          }
          if (!components[u][row]) components[u][row] = {};
          components[u][row][col] = true;
          components.splice(l, 1);
        } else if (u >= 0) {
          let c = components[u];
          if (!c[row]) c[row] = {};
          c[row][col] = true;
        } else if (l >= 0) {
          let c = components[l];
          if (!c[row]) c[row] = {};
          c[row][col] = true;
        } else {
          let c = {};
          c[row] = {};
          c[row][col] = true;
          components.push(c);
        }
      }
    }
    return components;
  }
  words() {
    var words = [];
    for (let row in this.data) {
      for (let col in this.data[row]) {
        var h = this.get(row, col);
        if (!h) continue;
        var d = this.get(+row+1, col);
        if (!this.get(row-1, col) && d) {
          let letters = [h,d];
          let i = +row+1;
          while (d = (this.get(++i, col))) {
            letters.push(d);
          }
          words.push(new Gridded({ letters, row: +row, col: +col, vertical: true, grid: this }));
        }
        var r = this.get(row, +col+1);
        if (!this.get(row, col-1) && r) {
          let letters = [h,r];
          let i = +col+1;
          while (r = this.get(row, ++i)) {
            letters.push(r);
          }
          words.push(new Gridded({ letters, row: +row, col: +col, vertical: false, grid: this }));
        }
      }
    }
    return words;
  }
}

class Gridded extends String {
  constructor(old) {
    super(old?.letters?.join(""));
    if (def(old?.letters)) this.letters = old.letters;
    if (def(old?.row)) this.row = +old.row;
    if (def(old?.col)) this.col = +old.col;
    if (def(old?.vertical)) this.vertical = old.vertical;
    if (def(old?.grid)) {
      this.grid = old.grid;
    }
    if (def(this.grid?.drift)) {
      this.drift = [this.grid.drift[0], this.grid.drift[1]];
    } else {
      this.drift = [0,0];
    }
  }

  includes(row, col, grid) {
    if (!grid) grid = this.grid;
    if (def(grid?.drift)) {
      row += this.drift[0] - grid.drift[0];
      col += this.drift[1] - grid.drift[1];
    }
    return (this.row <= row && row <= this.row + (this.vertical ? this.length : 0) &&
      this.col <= col && col <= this.col + (this.vertical ? 0 : this.length));
  }

  present(grid) {
    if (!grid) grid = this.grid;
    var row = this.row - this.drift[0] + grid.drift[0];
    var col = this.col - this.drift[1] + grid.drift[1];
    if (grid.get(row - (this.vertical ? 1 : 0), col - (this.vertical ? 0 : 1))) return false;
    for (let t of this.letters) {
      if (String(grid.get(row, col)) !== String(t)) return false;
      if (this.vertical) {
        row += 1;
      } else {
        col += 1;
      }
    }
    if (grid.get(row, col)) return false;
    return true;
  }
}

export {
  Letter,
  GameData,
  TileManager,
  APITileManager,
  JSTileManager,
  WordManager,
  JSWordManager,
  GameInterface,
  Bank,
  Grid,
  Gridded,
};
