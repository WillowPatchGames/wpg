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
    this.push(...values);
    return this;
  }

  delete(here) {
    if (!this.get(here)) return;
    this.splice(here, 1);
    return this;
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

  static deserialize(letters) {
    var ret = new LetterBank();

    for (let letter of letters) {
      ret.set(...letter.pos, new LetterTile(letter.letter));
    }

    return ret;
  }
}

// LetterGrid combines a bank of tiles with a set of 2D positions, forming a
//
// See also LetterGrid in pkg/games/word.go.
class LetterGrid {
  constructor(old) {
    // When there's an existing set of letters, copy them.
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
  get rowCount() {
    return this.data.length;
  }

  // Setter on the size rows;
  set rowCount(len) {
    this.data.length = len;
    for (let i = 0; i < len; i++) {
      if (!this.data[i]) {
        this.data[i] = [];
      }
    }
    this.cols = (null, this.cols);
  }
  get columnCount() {
    var res = 0;
    for (let row in this.data) {
      if (this.data[row].length > res) {
        res = this.data[row].length;
      }
    }
    return res;
  }
  set columnCount(len) {
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

  static deserialize(letters) {
    var adj = [
      -Math.min(...letters.map(l => l.pos[0])),
      -Math.min(...letters.map(l => l.pos[1])),
    ];
    if (!isFinite(adj[0])) adj[0] = 0;
    if (!isFinite(adj[1])) adj[1] = 0;
    var jda = [
      Math.max(...letters.map(l => l.pos[0])),
      Math.max(...letters.map(l => l.pos[1])),
    ];
    if (!isFinite(jda[0])) jda[0] = 0;
    if (!isFinite(jda[1])) jda[1] = 0;
    //console.log(adj, jda, letters);
    var ret = new Grid();
    if (!letters.length) return ret;
    ret.rows = jda[0] + adj[0];
    ret.cols = jda[1] + adj[1];
    for (let letter of letters) {
      let pos = letter.pos;
      pos[0] += adj[0];
      pos[1] += adj[1];
      ret.set(...pos, new LetterTile(letter.letter));
    }
    return ret;
  }
}
