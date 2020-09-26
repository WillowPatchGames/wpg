function def(v) {
  return v !== undefined && v !== null;
}

// See also: LetterTile in pkg/games/word.go
class LetterTile extends String {
  constructor(obj) {
    super(obj.display ? obj.display : obj.value);

    this.id = obj.id;
    this.display = obj.display ? obj.display : obj.value;
    this.value = obj.value;
    this.score = obj.score;
  }

  static deserialize(data) {
    return new LetterTile(data);
  }
}

// See also: LetterPos in pkg/games/word.go
class LetterPos {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

// LetterBank handles managing arrays of tiles.
class LetterBank extends Array {
  constructor(...arg) {
    if (arg.length === 1 && (arg[0] instanceof LetterBank || arg[0] instanceof Array)) {
      super(...arg[0]);
    } else {
      super(...arg);
    }
  }

  get(here) {
    return this[here];
  }

  set(here, value) {
    if (!this.get(here)) {
      return this.add(value);
    } else {
      this[here] = value;
      return this;
    }
  }

  add(...values) {
    for (let value of values) {
      if (!(value instanceof LetterTile)) {
        console.log("--->", value);
        value = new LetterTile(value);
      }

      this.push(value);
    }
    return this;
  }

  delete(here) {
    if (here instanceof LetterTile) {
      var location = this.findLetter(here);
      return this.delete(...location);
    }

    if (!this.get(here)) return;
    this.splice(here, 1);
    return this;
  }

  // Find a letter (either by identifier or by LetterTile instance) in this
  // bank.
  findLetter(letter) {
    if (letter instanceof LetterTile) {
      letter = letter.id;
    }

    letter = +letter;

    for (let index in this) {
      if (def(this[index]) && this[index].id === letter) {
        return [index];
      }
    }

    return null;
  }

  empty() {
    return !this.letterPositions().length;
  }

  // Returns a set of letters with their corresponding positions (indices) in
  // the LetterBank.
  letterPositions() {
    var letters = [];

    for (let index in this) {
      var value = this[index];
      if (!value) {
        continue;
      }

      letters.push({ letter: value, pos: [+index] });
    }

    return letters;
  }

  // Returns a set of letters, relative to their positions in the bank. Unlike
  // letterPositions(...), position isn't explicitly encoded.
  serialize() {
    var result = [];

    for (let index in this) {
      var value = this[index];
      if (!value) {
        continue;
      }

      result.push(value);
    }

    return result;
  }

  // Couples with serialize(); creates a bank of tiles. Note that position is
  // implicitly encoded in the method instead of explicitly.
  static deserialize(letters) {
    var ret = new LetterBank();

    for (let letter of letters) {
      ret.push(new LetterTile(letter));
    }

    return ret;
  }
}

// A static, empty LetterBank
LetterBank.blank = new LetterBank();

// LetterGrid combines a bank of tiles with a set of 2D positions, forming a
//
// See also LetterGrid in pkg/games/word.go.
class LetterGrid {
  constructor(old) {
    // When there's an existing set of letters, copy them. Data is looked up
    // via (row == x) and then by (col == y) ==> data[row][col].
    if (old?.data) {
      this.data = old.data;
    } else {
      this.data = new LetterBank();
    }

    // Drift describes the offset of the view from center.
    if (old?.drift) {
      this.drift = [old.drift[0], old.drift[1]];
    } else {
      this.drift = [0, 0];
    }
  }

  // Getter on rows. Returns the current number of rows in this grid.
  get rows() {
    return this.data.length;
  }

  // Setter on the size rows;
  set rows(len) {
    this.data.length = len;

    for (let i = 0; i < len; i++) {
      if (!this.data[i]) {
        this.data[i] = new LetterBank();
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

  // Returns a tile at a certain position.
  get(row, col) {
    return this.data[row] && this.data[row][col];
  }

  // Sets the tile at a certain position.
  set(row, col, value) {
    if (!value) {
      return this.delete(row, col);
    }

    if (!this.data[row]) this.data[row] = new LetterBank();
    this.data[row][col] = value;
    return this;
  }

  delete(row, col) {
    delete this.data[row][col];
    return this;
  }

  writeWord(word, row, col, vert, cons) {
    for (let letter of word) {
      if (!this.data[row]) this.data[row] = new LetterBank();
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
          while (def(d = (this.get(++i, col)))) {
            letters.push(d);
          }
          words.push(new Gridded({ letters, row: +row, col: +col, vertical: true, grid: this }));
        }
        var r = this.get(row, +col+1);
        if (!this.get(row, col-1) && r) {
          let letters = [h,r];
          let i = +col+1;
          while (def(r = this.get(row, ++i))) {
            letters.push(r);
          }
          words.push(new Gridded({ letters, row: +row, col: +col, vertical: false, grid: this }));
        }
      }
    }
    return words;
  }

  // Find a letter (either by identifier or by LetterTile instance) in this
  // grid.
  findLetter(letter) {
    for (let row in this.data) {
      var result = this.data[row].findLetter(letter);
      if (result !== null) {
        return ["grid", row, ...result];
      }
    }

    return null;
  }

  // Whether or not this letter grid is empty.
  empty() {
    return !this.letterPositions().length;
  }

  letterPositions() {
    var letters = [];

    for (let row in this.data) {
      for (let col in this.data[row]) {
        var h = this.get(row, col);
        if (!h) continue;
        letters.push({ letter: h, pos: [+row,+col] });
      }
    }

    return letters;
  }

  serialize() {
    var tiles = [];
    var positions = {};

    for (let row in this.data) {
      for (let col in this.data[row]) {
        var tile = this.get(row, col);
        if (!tile) {
          continue;
        }

        tiles.push(tile);
        positions[tile.id] = new LetterPos(row, col);
      }
    }

    return {
      'tiles': tiles,
      'positions': positions
    }
  }

  static deserialize(grid) {
    var xlocs = [];
    var ylocs = [];
    for (let key in grid.positions) {
      let pos = grid.positions[key];
      xlocs.push(pos.x);
      ylocs.push(pos.y);
    }

    var adj = [
      -Math.min(...xlocs),
      -Math.min(...ylocs)
    ];

    if (!isFinite(adj[0])) adj[0] = 0;
    if (!isFinite(adj[1])) adj[1] = 0;

    var jda = [
      Math.max(...xlocs),
      Math.max(...ylocs)
    ];

    if (!isFinite(jda[0])) jda[0] = 0;
    if (!isFinite(jda[1])) jda[1] = 0;

    var ret = new LetterGrid();

    ret.rows = jda[0] + adj[0];
    ret.cols = jda[1] + adj[1];

    console.log("Setting: ", ret.rows, ret.cols, adj, jda);

    for (let tile of grid.tiles) {
      let pos = grid.positions[tile.id];
      ret.set(pos.x + adj[0], pos.y + adj[1], new LetterTile(tile));
    }

    ret.drift = [-adj[0], -adj[1]];

    console.log(ret);

    return ret;
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
  LetterTile,
  LetterPos,
  LetterBank,
  LetterGrid,
  Gridded
}
