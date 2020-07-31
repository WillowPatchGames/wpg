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

const defaultGrid = new Grid();
defaultGrid.writeWord("APPLET", 3, 0, false, Letter);
defaultGrid.writeWord("TEACHER", 2, 4, true, Letter);
defaultGrid.writeWord("MAC", 5, 2, false, Letter);
defaultGrid.padding(5);

var PADDING = [8,14];
var SIZE = 35;
var INITIAL_DRAW = 0;

function inword(word, row, col) {
  if (word.row == row && word.col == col) return true;
  if (word.vertical) {
    if (word.row <= row && row <= +word.row + word.length && word.col == col) {
      return true;
    }
  } else {
    if (word.row == row && word.col <= col && col <= +word.col + word.length) {
      return true;
    }
  }
  return false;
}

function randomLetter() {
  // https://norvig.com/mayzner.html
  var bias = [
    8.04, 1.48, 3.34, 3.82, 12.49, 2.40, 1.87, 5.05, 7.57, 0.16, 0.54, 4.07, 2.51,
    7.23, 7.64, 2.14, 0.12, 6.28, 6.51, 9.28, 2.73, 1.05, 1.68, 0.23, 1.66, 0.09,
  ];
  var sum = 0;
  var cumulativeBias = bias.map(function(x) { sum += x; return sum; });
  var choice = Math.random() * sum;
  var chosenIndex = null;
  cumulativeBias.some(function(el, i) {
      return el > choice ? ((chosenIndex = i), true) : false;
  });
  var chosenElement = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[chosenIndex];
  return new Letter(chosenElement);
}

function monitor(msg, promise) {
  return promise.then(r => {
    if (r === undefined || r === null) {
      console.log(msg, r);
    } else {
      console.log(r);
    }
    return r;
  }, console.log);
}

class Game extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      presentation: {
        selected: null,
        pos: {},
        dropped: null,
        scale: 1,
        scaled: 1,
        unwords: [],
      },
      data: new GameInterface({
        words: wordmanager,
        tiles: tilemanager,
      }),
    };
    var adder = tilemanager.onAdd;
    tilemanager.onAdd = (...tiles) => {
      adder.call(tilemanager, ...tiles);
      this.setState(state => state);
    };
    this.board = React.createRef();
    this.pending = {
      scroll: [0,0],
    };
  }

  droppable(where, area) {
    return (ref) => {
      if (ref) {
        this.state.presentation.pos[where] = {ref, where, area};
      } else {
        delete this.state.presentation.pos[where];
      }
    };
  }

  repad(state) {
    if (!state) state = this.state;
    var adj = state.data.grid.padding(PADDING);
    this.pending.scroll[0] += adj[0];
    this.pending.scroll[1] += adj[1];
    return state;
  }

  includes(a,b) {
    var x = Math.max(a.left, b.left);
    var w = Math.min(a.right, b.right) - x;
    var y = Math.max(a.top, b.top);
    var h = Math.min(a.bottom, b.bottom) - y;
    if (w < 0 || h < 0) return;
    return new DOMRect(x, y, w, h);
  }
  intersect(l,r) {
    var i = this.includes(l, r);
    if (!i) return;
    return i.width * i.height;
  }

  draggable(where) {
    return (status, ref) => {
      if (status !== "end") {
        return;
      }
      var res = undefined, D = 0;
      var here = ref.current.getBoundingClientRect();
      var areas = [];
      for (let there in this.state.presentation.pos) {
        var testing = this.state.presentation.pos[there].ref.getBoundingClientRect();
        var parent = this.state.presentation.pos[there].ref.parentElement;
        while (testing && parent) {
          if (getComputedStyle(parent).overflow === "auto") {
            testing = this.includes(parent.getBoundingClientRect(), testing);
          }
          parent = parent.parentElement;
        }
        if (!testing) continue;
        var d = this.intersect(here, testing);
        if (d !== undefined) {
          if (this.state.presentation.pos[there].area) {
            areas.push(this.state.presentation.pos[there].where);
          } else if (d > D) {
            D = d; res = this.state.presentation.pos[there].where;
          }
        }
      }
      if (!res && areas.length === 1) {
        res = areas[0];
      }
      if (status === "end" && res) {
        if (!shallowEqual(res, where)) {
          this.swap(where, res, true);
        }
      }
      return res;
    };
  }

  discard(here) {
    monitor("Could not discard", this.state.data.discard(here)).then(() => this.setState(state => state));
  }

  swap(here,there,dropped) {
    if (there[0] === "discard") {
      this.discard(here);
    }
    this.setState((state) => {
      if (here[0] === "bank" && there[0] === "bank") {
      } else if (here[0] === "grid" && there[0] === "bank") {
        var dat = state.data.grid.data[here[1]][here[2]];
        if (state.data.bank[there[1]]) {
          state.data.grid.data[here[1]][here[2]] = state.data.bank[there[1]];
          this.repad(state);
          state.data.bank.splice(there[1], 1, ...(dat ? [dat] : []));
        } else {
          delete state.data.grid.data[here[1]][here[2]];
          this.repad(state);
          state.data.bank.splice(there[1]+1, 0, ...(dat ? [dat] : []));
        }
      } else if (here[0] === "bank" && there[0] === "grid") {
        var dat = state.data.grid.data[there[1]][there[2]];
        if (state.data.bank[here[1]]) {
          state.data.grid.data[there[1]][there[2]] = state.data.bank[here[1]];
          this.repad(state);
          state.data.bank.splice(here[1], 1, ...(dat ? [dat] : []));
        } else {
          delete state.data.grid.data[there[1]][there[2]];
          this.repad(state);
          state.data.bank.splice(here[1]+1, 0, ...(dat ? [dat] : []));
        }
      } else if (here[0] === "grid" && there[0] === "grid") {
        var dat = state.data.grid.data[here[1]][here[2]];
        state.data.grid.data[here[1]][here[2]] = state.data.grid.data[there[1]][there[2]];
        state.data.grid.data[there[1]][there[2]] = dat;
        this.repad(state);
      }
      if (dropped) {
        state.presentation.dropped = here;
      }
      state.presentation.selected = null;
      return state;
    })
  }

  componentDidMount() {
    this.setState(this.repad);
    this.state.data.draw(INITIAL_DRAW).then(() => this.setState((state) => {
      return state;
    }));
  }
  componentDidUpdate() {
    if (this.pending.scroll[0]) {
      this.board.current.scrollTop += SIZE*this.pending.scroll[0];
      this.pending.scroll[0] = 0;
    }
    if (this.pending.scroll[1]) {
      this.board.current.scrollLeft += SIZE*this.pending.scroll[1];
      this.pending.scroll[1] = 0;
    }
  }

  render() {
    let grid = e('div', {key: "grid", className: "board", ref: this.board}, e('table',
      {
        className: "word grid",
        style: {
          transform: FIXED ? "none" : "scale(" + this.state.presentation.scale + ")",
          "--font-size": FIXED ? (this.state.presentation.scale * 30) + "px" : "",
        },
        onTouchMove: e => {
          var scale = e.nativeEvent.scale;
          if (scale && scale !== 1) {
            e.preventDefault();
            this.setState((state) => {
              state.presentation.scale = Math.min(2, Math.max(0.5, state.presentation.scaled * scale));
              return state;
            });
          }
        },
        onTouchEnd: e => {
          if (this.state.presentation.scaled === this.state.presentation.scale) return;
          this.setState((state) => {
            state.presentation.scale = Math.round(state.presentation.scale*20)/20;
            state.presentation.scaled = state.presentation.scale;
            return state;
          })
        }
      },
      e('tbody', {}, Array.from(this.state.data.grid.data).map((row, i) =>
        e('tr', {key: i}, Array.from(row).map((dat, j) =>
          e('td', {
            className: dat ? (this.state.presentation.unwords.filter(w => w.present() && w.includes(i, j, this.state.data.grid)).length ? "unword" : "") : "empty",
            ref: this.droppable(["grid",i,j]),
            style: FIXED ? {} : {"position":"relative"},
            key: j, onClick: () => {
              if (this.state.presentation.selected) {
                if (this.state.presentation.selected[0] === "discard") {
                  this.discard(["grid", i, j]);
                }
              }
              this.setState((state) => {
                const here = ["grid", i, j];
                if (shallowEqual(here, state.presentation.dropped)) {
                  state.presentation.selected = null;
                  state.presentation.dropped = null;
                  return;
                }
                if (shallowEqual(state.presentation.selected, here)) {
                  state.presentation.selected = null;
                } else if (!state.presentation.selected) {
                  state.presentation.selected = here;
                } else if (state.presentation.selected[0] === "grid") {
                  state.data.grid.data[i][j] = state.data.grid.data[state.presentation.selected[1]][state.presentation.selected[2]];
                  state.data.grid.data[state.presentation.selected[1]][state.presentation.selected[2]] = dat;
                  this.repad(state);
                  state.presentation.selected = dat || state.data.grid.data[i][j] ? null : here;
                } else if (state.presentation.selected[0] === "bank") {
                  if (state.data.bank[state.presentation.selected[1]]) {
                    state.data.grid.data[i][j] = state.data.bank[state.presentation.selected[1]];
                    this.repad(state);
                    state.data.bank.splice(state.presentation.selected[1], 1, ...(dat ? [dat] : []));
                  } else {
                    delete state.data.grid.data[i][j];
                    this.repad(state);
                    state.data.bank.splice(state.presentation.selected[1]+1, 0, ...(dat ? [dat] : []));
                  }
                  state.presentation.selected = null;
                } else if (state.presentation.selected[0] === "discard") {
                  state.presentation.selected = null;
                }
                return state;
              });
            },
            "data-selected": shallowEqual(this.state.presentation.selected, ["grid", i, j])
          }, dat ? e(Drag, {className: "word tile", onDrag: this.draggable(["grid", i, j])}, dat) : e('div', {}, "\xa0"))
        )
      )
    ))));
    let bank = e('div', {key: "bank", className: "word bank", ref: this.droppable(["bank",""], true)},
      [
        e('div', {key: "letters", className: "letters"}, this.state.data.bank.map((letter, i) =>
          e('span', {
            key: i, className: "letter" + (letter ? " draggable" : " empty"),
            ref: this.droppable(["bank", i]),
            onClick: () => {
              if (this.state.presentation.selected) {
                if (this.state.presentation.selected[0] === "discard") {
                  this.discard(["bank", i]);
                }
              }
              this.setState((state) => {
                const here = ["bank", i];
                if (shallowEqual(here, state.presentation.dropped)) {
                  state.presentation.selected = null;
                  state.presentation.dropped = null;
                  return;
                }
                if (shallowEqual(state.presentation.selected, here)) {
                  state.presentation.selected = null;
                } else if (!state.presentation.selected) {
                  state.presentation.selected = here;
                } else if (state.presentation.selected[0] === "bank") {
                  state.presentation.selected = here;
                } else if (state.presentation.selected[0] === "grid") {
                  var dat = state.data.grid.data[state.presentation.selected[1]][state.presentation.selected[2]];
                  if (state.data.bank[i]) {
                    state.data.grid.data[state.presentation.selected[1]][state.presentation.selected[2]] = state.data.bank[i];
                    this.repad(state);
                    state.data.bank.splice(i, 1, ...(dat ? [dat] : []));
                  } else {
                    delete state.data.grid.data[state.presentation.selected[1]][state.presentation.selected[2]];
                    this.repad(state);
                    state.data.bank.splice(i+1, 0, ...(dat ? [dat] : []));
                  }
                  state.presentation.selected = null;
                } else if (state.presentation.selected[0] === "discard") {
                  state.presentation.selected = null;
                }
                return state;
              });
            }, "data-selected": shallowEqual(this.state.presentation.selected, ["bank", i])
          }, letter ? e(Drag, {className: "word tile", onDrag: this.draggable(["bank", i])}, letter) : e(Drag, {onDrag: this.draggable(["bank", i])}))
        )),
        e('div', {key: "after", className: "actions"},
          [
            e('button', {
              key: "draw",
              className: this.state.data.bank.length > 1 || this.state.data.grid.components().length > 1 ? "disabled" : "",
              onClick: async () => {
                var unwords;
                if (this.state.data.bank.length > 1 || this.state.data.grid.components().length > 1) {
                  console.log("You must connect all of your tiles together before drawing!");
                } else if ((unwords = await this.state.data.check()).length) {
                  console.log("Invalid words: ", unwords.map(String));
                  this.setState((state) => {
                    state.presentation.unwords = unwords;
                    return state;
                  });
                } else {
                  await monitor("Could not draw", this.state.data.draw());
                  this.setState((state) => {
                    return state;
                  });
                }
              },
            }, "Draw"),
            e('button', {
              key: "check",
              onClick: async () => {
                var unwords = await this.state.data.check();
                if (unwords.length) console.log("Invalid words: ", unwords.map(String));
                this.setState((state) => {
                  state.presentation.unwords = unwords;
                  return state;
                })
              },
            }, "Check"),
            e('button', {
              key: "discard",
              "data-selected": shallowEqual(this.state.presentation.selected, ["discard"]),
              ref: this.droppable(["discard"]),
              onClick: () => {
                if (this.state.presentation.selected) {
                  if (this.state.presentation.selected[0] === "bank") {
                    this.discard(this.state.presentation.selected);
                  } else if (this.state.presentation.selected[0] === "grid") {
                    if (state.data.grid.data[state.presentation.selected[1]][state.presentation.selected[2]]) {
                      this.discard(this.state.presentation.selected);
                    }
                  }
                }
                this.setState((state) => {
                  const here = ["discard"];
                  if (shallowEqual(state.presentation.selected, here)) {
                    state.presentation.selected = null;
                  } else if (!state.presentation.selected) {
                    state.presentation.selected = here;
                  } else if (state.presentation.selected[0] === "bank") {
                    state.presentation.selected = null;
                  } else if (state.presentation.selected[0] === "grid") {
                    if (state.data.grid.data[state.presentation.selected[1]][state.presentation.selected[2]]) {
                      state.presentation.selected = null;
                    } else {
                      state.presentation.selected = here;
                    }
                  }
                  return state;
                });
              },
            }, "Discard"),
          ]
        )
      ]
    );
    return e('div', {className: "game-component"}, [grid, bank]);
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

var FRICTION = 3;
var FIXED = true;

class Drag extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      x: 0, y: 0,
      dx: 0, dy: 0,
      x0: 0, y0: 0,
      dragging: null,
      listeners: [],
    };
    this.ref = React.createRef();
  }

  componentWillUnmount() {
    for (let l of this.state.listeners) {
      l();
    }
  }

  getDragData(e, initial) {
    var dragging;
    if (e.touches) {
      var touches;
      if (initial) {
        touches = e.targetTouches;
      } else if (this.state.dragging && this.state.dragging.touch !== undefined) {
        touches = Array.from(e.touches).filter(t => t.identifier === this.state.dragging.touch);
      }
      if (touches && touches.length === 1) {
        var touch = touches[0];
        dragging = {x: touch.pageX, y: touch.pageY, touch: touch.identifier};
      }
      e.preventDefault();
    } else if (initial || !this.state.dragging || this.state.dragging.touch === undefined) {
      dragging = {x: e.pageX, y: e.pageY};
    }
    return dragging;
  }

  start(dragging) {
    if (!dragging) return;
    if (this.props.onDrag) {
      this.setState(() => {
        var bb = this.ref.current.getBoundingClientRect();
        if (FIXED) {
          this.state.x0 = bb.left;
          this.state.y0 = bb.top;
        } else {
          this.state.x0 = this.ref.current.offsetTop;
          this.state.y0 = this.ref.current.offsetLeft;
        }
        this.state.dragging = dragging;
        var cx = (bb.left + bb.right)/2;
        var cy = (bb.top + bb.bottom)/2;
        this.state.dx = cx - dragging.x;
        this.state.dy = cy - dragging.y;
        if (dragging.touch !== undefined) {
          this.state.listeners.push(bodyListener("touchmove", e => this.move(this.getDragData(e))));
          this.state.listeners.push(bodyListener("touchend", e => this.end()));
        } else {
          this.state.listeners.push(bodyListener("mousemove", e => this.move(this.getDragData(e))));
          this.state.listeners.push(bodyListener("mouseup", e => this.end()));
        }
        this.props.onDrag("start", this.ref);
      });
    }
  }
  move(dragging) {
    if (!dragging) return;
    if (this.state.dragging && this.props.onDrag) {
      this.setState(() => {
        var x0 = this.state.x; var y0 = this.state.y;
        this.state.x = dragging.x - this.state.dragging.x;
        this.state.y = dragging.y - this.state.dragging.y;
        var clamp = (z,r) => Math.min(r, Math.max(-r, z));
        var dx = clamp(this.state.dx, Math.abs(this.state.x - x0)/FRICTION);
        var dy = clamp(this.state.dy, Math.abs(this.state.y - y0)/FRICTION);
        this.state.dx -= dx;
        this.state.x += dx;
        this.state.dragging.x += dx;
        this.state.dy -= dy;
        this.state.y += dy;
        this.state.dragging.y += dy;
        return this.state;
      }, () => {
        this.props.onDrag("move", this.ref);
      });
    }
  }
  end() {
    if (this.state.dragging && this.props.onDrag) {
      this.setState(() => {
        this.state.dragging = null;
        this.state.x = 0;
        this.state.y = 0;
        this.state.dx = 0;
        this.state.dy = 0;
        this.state.x0 = 0;
        this.state.y0 = 0;
        for (let l of this.state.listeners) {
          l();
        }
        this.state.listeners = [];
        this.props.onDrag("end", this.ref);
        return this.state;
      });
    }
  }

  render() {
    return e('div', mergeProps({
      style: Object.assign({
        cursor: "pointer",
        touchAction: "none",
      }, !this.state.dragging ? {} : {
        transform: "translate(" + this.state.x + "px, " + this.state.y + "px)",
        left: this.state.x0,
        top: this.state.y0,
        zIndex: 100,
        position: FIXED ? "fixed" : "absolute",
      }),
      onMouseDown: e => (e.button === 1 || e.buttons === 1) ? this.start(this.getDragData(e, true)) : undefined,
      onTouchStart: e => this.start(this.getDragData(e, true)),
      onMouseMove: e => this.move(this.getDragData(e, false)),
      onTouchMove: e => this.move(this.getDragData(e, false)),
      onMouseUp: e => this.end(),
      onTouchEnd: e => this.end(),
      ref: this.ref,
    }, this.props), this.props.children);
  }
}
