'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var hasOwn = Object.prototype.hasOwnProperty;
function is(x, y) {
    if (x === y) {
        return x !== 0 || y !== 0 || 1 / x === 1 / y;
    } else {
        return x !== x && y !== y;
    }
}

function shallowEqual(objA, objB) {
    var excludes = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];

    if (Object.is(objA, objB)) return true;
    if ((typeof objA === "undefined" ? "undefined" : _typeof(objA)) !== 'object' || objA === null || (typeof objB === "undefined" ? "undefined" : _typeof(objB)) !== 'object' || objB === null) {
        return false;
    }
    var keysA = Object.keys(objA).filter(function (key) {
        return !excludes.some(function (excludeKey) {
            return excludeKey === key;
        });
    });
    var keysB = Object.keys(objB).filter(function (key) {
        return !excludes.some(function (excludeKey) {
            return excludeKey === key;
        });
    });
    if (keysA.length !== keysB.length) return false;
    for (var i = 0; i < keysA.length; i++) {
        if (!hasOwn.call(objB, keysA[i]) || !is(objA[keysA[i]], objB[keysA[i]])) {
            return false;
        }
    }
    return true;
}

const e = React.createElement;

class Letter {
  constructor(value) {
    this.value = value;
    this.id = Letter.id++;
  }
}
Letter.id = 0;

class Grid {
  constructor(data) {
    if (!data) data = [];
    this.data = data;
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
    this.cols = this.cols;
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
    this.rows = this.rows;
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

    return [amt[0] - i, amt[1] - j];
  }
}

const defaultGrid = new Grid();
defaultGrid.writeWord("APPLE", 3, 0, false, Letter);
defaultGrid.writeWord("TEACHER", 2, 4, true, Letter);
defaultGrid.writeWord("MAC", 5, 2, false, Letter);
defaultGrid.padding(2);

console.log(defaultGrid);

class Game extends React.Component {
  constructor(props) {
    super(props);
    this.state = { scroll: [0,0], grid: defaultGrid, bank: ["\xa0","E","I","J","M","R","Q"].map(l => new Letter(l)), selected: null };
  }

  render() {
    let grid = e('table',
      {
        key: "grid", className: "word grid", style: {
          //transform: "translate(" + (35*this.state.scroll[1]) + "px," + (35*this.state.scroll[0]) + "px)",
        },
      },
      e('tbody', {}, Array.from(this.state.grid.data).map((row, i) =>
        e('tr', {key: i}, Array.from(row).map((dat, j) =>
          e('td', {
            key: j, onClick: () => {
              this.setState((state) => {
                const here = ["grid", i, j];
                if (shallowEqual(state.selected, here)) {
                  state.selected = null;
                } else if (!state.selected) {
                  state.selected = here;
                } else if (state.selected[0] === "grid") {
                  state.grid.data[i][j] = state.grid.data[state.selected[1]][state.selected[2]];
                  state.grid.data[state.selected[1]][state.selected[2]] = dat;
                  state.selected = here;
                } else if (state.selected[0] === "bank") {
                  if (state.bank[state.selected[1]].value !== "\xa0") {
                    state.grid.data[i][j] = state.bank[state.selected[1]];
                    var adj = state.grid.padding(2);
                    state.scroll[0] -= adj[0];
                    state.scroll[1] -= adj[1];
                    state.bank.splice(state.selected[1], 1, ...(dat?.value ? [dat] : []));
                  } else {
                    delete state.grid.data[i][j];
                    var adj = state.grid.padding(2);
                    state.scroll[0] -= adj[0];
                    state.scroll[1] -= adj[1];
                    console.log(dat);
                    state.bank.splice(state.selected[1]+1, 0, ...(dat?.value ? [dat] : []));
                  }
                  state.selected = null;
                }
                return state;
              });
            }, onDoubleClick: () => {
              this.setState((state) => {
                if (dat?.value) {
                  delete state.grid.data[i][j];
                  var adj = state.grid.padding(2);
                  state.scroll[0] -= adj[0];
                  state.scroll[1] -= adj[1];
                  state.bank.push(new Letter(dat.value));
                  state.selected = null;
                }
              });
            },
            "data-selected": shallowEqual(this.state.selected, ["grid", i, j])
          }, dat?.value)
        )
      )
    )));
    let bank = e('div', {key: "bank", className: "word bank"}, this.state.bank.map((letter, i) =>
      e('span', {
        key: i, className: "letter",
        onClick: () => {
          this.setState((state) => {
            const here = ["bank", i];
            if (shallowEqual(state.selected, here)) {
              state.selected = null;
            } else if (!state.selected) {
              state.selected = here;
            } else if (state.selected[0] === "bank") {
              state.selected = here;
            } else if (state.selected[0] === "grid") {
              var dat = state.grid.data[state.selected[1]][state.selected[2]];
              if (state.bank[i].value !== "\xa0") {
                state.grid.data[state.selected[1]][state.selected[2]] = state.bank[i];
                var adj = state.grid.padding(2);
                state.scroll[0] -= adj[0];
                state.scroll[1] -= adj[1];
                state.bank.splice(i, 1, ...(dat?.value ? [dat] : []));
              } else {
                delete state.grid.data[state.selected[1]][state.selected[2]];
                var adj = state.grid.padding(2);
                state.scroll[0] -= adj[0];
                state.scroll[1] -= adj[1];
                state.bank.splice(i+1, 0, ...(dat?.value ? [dat] : []));
              }
              state.selected = null;
            }
            return state;
          });
        }, "data-selected": shallowEqual(this.state.selected, ["bank", i])
      }, letter.value)
    ));
    return e('div', {}, [grid, bank]);
  }
}

components['#game'] = Game;

function bodyListener(ty, cb) {
  var listener = (...arg) => cb(...arg);
  document.addEventListener(ty, listener, { passive: false });
  return (() => {
    document.removeEventListener(ty, listener);
  });
};

class Drag extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      x: 0, y: 0,
      dragging: null,
      listeners: [],
    };
  }

  render() {
    return e('div', {
      className: "word tile",
      style: {
        transform: "translate(" + this.state.x + "px, " + this.state.y + "px)",
        cursor: "pointer",
        touchAction: "none",
      },
      onMouseDown: e => {
        var dragging = {x: e.pageX, y: e.pageY};
        this.setState(() => {
          this.state.dragging = dragging;
          this.state.listeners.push(bodyListener("mousemove", e => {
            if (this.state.dragging) {
              var dragging = {x: e.pageX, y: e.pageY};
              this.setState(() => {
                this.state.x = dragging.x - this.state.dragging.x;
                this.state.y = dragging.y - this.state.dragging.y;
                return this.state;
              });
            }
          }));
          this.state.listeners.push(bodyListener("mouseup", e => {
            this.setState(() => {
              this.state.dragging = null;
              this.state.x = 0;
              this.state.y = 0;
              for (let l of this.state.listeners) {
                l();
              }
              return this.state;
            });
          }));
          return this.state;
        });
      },
      onTouchStart: e => {
        var touches = e.targetTouches;
        if (touches.length === 1) {
          var touch = touches[0];
          var dragging = {x: touch.pageX, y: touch.pageY, touch: touch.identifier};
          this.setState(() => {
            this.state.dragging = dragging;
            this.state.listeners.push(bodyListener("touchmove", e => {
              if (this.state.dragging) {
                var touches = Array.from(e.touches).filter(t => t.identifier === this.state.dragging.touch);
                if (touches.length === 1) {
                  var touch = touches[0];
                  var dragging = {x: touch.pageX, y: touch.pageY};
                  this.setState(() => {
                    this.state.x = dragging.x - this.state.dragging.x;
                    this.state.y = dragging.y - this.state.dragging.y;
                    return this.state;
                  });
                  e.preventDefault();
                }
              }
            }));
            this.state.listeners.push(bodyListener("touchend", e => {
              this.setState(() => {
                this.state.dragging = null;
                this.state.x = 0;
                this.state.y = 0;
                for (let l of this.state.listeners) {
                  l();
                }
                return this.state;
              });
              e.preventDefault();
            }));
            return this.state;
          });
          e.preventDefault();
        }
      },
      onMouseUp: e => {
        this.setState(() => {
          this.state.dragging = null;
          this.state.x = 0;
          this.state.y = 0;
          for (let l of this.state.listeners) {
            l();
          }
          return this.state;
        });
      },
      onMouseMove: e => {
        if (this.state.dragging) {
          var dragging = {x: e.pageX, y: e.pageY};
          this.setState(() => {
            this.state.x = dragging.x - this.state.dragging.x;
            this.state.y = dragging.y - this.state.dragging.y;
            return this.state;
          });
        }
      },
      onTouchEnd: e => {
        this.setState(() => {
          this.state.dragging = null;
          this.state.x = 0;
          this.state.y = 0;
          for (let l of this.state.listeners) {
            l();
          }
          return this.state;
        });
        e.preventDefault();
      },
      onTouchMove: e => {
        if (this.state.dragging) {
          var touches = Array.from(e.touches).filter(t => t.identifier === this.state.dragging.touch);
          if (touches.length === 1) {
            var touch = touches[0];
            var dragging = {x: touch.pageX, y: touch.pageY};
            this.setState(() => {
              this.state.x = dragging.x - this.state.dragging.x;
              this.state.y = dragging.y - this.state.dragging.y;
              return this.state;
            });
            e.preventDefault();
          }
        }
      },
    }, "Z");
  }
}

components['#drag'] = Drag;
