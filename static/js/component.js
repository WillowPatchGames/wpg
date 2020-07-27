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

class Game extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      presentation: {
        scroll: [0,0],
        selected: null,
        pos: {},
        dropped: null,
      },
      data: {
        grid: defaultGrid,
        bank: [null].concat(["E","I","J","M","R","Q"].map(l => new Letter(l)))
      },
    };
  }

  drop(where) {
    return (ref) => {
      if (ref) {
        this.state.presentation.pos[where] = {ref, where};
      } else {
        delete this.state.presentation.pos[where];
      }
    };
  }
  repad(state) {
    if (!state) state = this.state;
    var adj = state.data.grid.padding(2);
    state.presentation.scroll[0] -= adj[0];
    state.presentation.scroll[1] -= adj[1];
    return state;
  }

  intersect(a,b) {
    if (String(a) == String(b)) return;
    var l = this.state.presentation.pos[a].ref.current.getBoundingClientRect();
    var r = this.state.presentation.pos[b].ref.current.getBoundingClientRect();
    var disjoint =
      l.left > r.right ||
      l.right < r.left ||
      l.top > r.bottom ||
      l.bottom < r.top;
    if (disjoint) return;
    var center = bb => ({
      x: (bb.left + bb.right)/2,
      y: (bb.top + bb.bottom)/2
    });
    var cl = center(l), cr = center(r);
    return Math.sqrt(
      Math.pow(cl.x - cr.x, 2) +
      Math.pow(cl.y - cr.y, 2)
    );
  }

  drag(where) {
    return (final) => {
      var res = undefined, D = Infinity;
      for (let there in this.state.presentation.pos) {
        var d = this.intersect(there, where);
        if (d !== undefined) {
          if (d < D) {
            D = d; res = this.state.presentation.pos[there].where;
          }
        }
      }
      if (final && res) {
        this.swap(where, res, true);
      }
      return res;
    };
  }

  swap(here,there,dropped) {
    this.setState((state) => {
      if (here[0] === "bank" && there[0] === "bank") {
      } else if (here[0] === "grid" && there[0] === "bank") {
        var dat = state.data.grid.data[here[1]][here[2]];
        if (state.data.bank[there[1]]?.value) {
          state.data.grid.data[here[1]][here[2]] = state.data.bank[there[1]];
          this.repad(state);
          state.data.bank.splice(there[1], 1, ...(dat?.value ? [dat] : []));
        } else {
          delete state.data.grid.data[here[1]][here[2]];
          this.repad(state);
          state.data.bank.splice(there[1]+1, 0, ...(dat?.value ? [dat] : []));
        }
      } else if (here[0] === "bank" && there[0] === "grid") {
        var dat = state.data.grid.data[there[1]][there[2]];
        if (state.data.bank[here[1]]?.value) {
          state.data.grid.data[there[1]][there[2]] = state.data.bank[here[1]];
          this.repad(state);
          state.data.bank.splice(here[1], 1, ...(dat?.value ? [dat] : []));
        } else {
          delete state.data.grid.data[there[1]][there[2]];
          this.repad(state);
          state.data.bank.splice(here[1]+1, 0, ...(dat?.value ? [dat] : []));
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

  render() {
    let grid = e('table',
      {
        key: "grid", className: "word grid", style: {
          //transform: "translate(" + (35*this.state.presentation.scroll[1]) + "px," + (35*this.state.presentation.scroll[0]) + "px)",
        },
      },
      e('tbody', {}, Array.from(this.state.data.grid.data).map((row, i) =>
        e('tr', {key: i}, Array.from(row).map((dat, j) =>
          e('td', {
            className: dat ? "" : "empty",
            key: j, onClick: () => {
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
                  state.presentation.selected = dat || state.data.grid.data[i][j] ? null : here;
                  this.repad(state);
                } else if (state.presentation.selected[0] === "bank") {
                  if (state.data.bank[state.presentation.selected[1]]?.value) {
                    state.data.grid.data[i][j] = state.data.bank[state.presentation.selected[1]];
                    this.repad(state);
                    state.data.bank.splice(state.presentation.selected[1], 1, ...(dat?.value ? [dat] : []));
                  } else {
                    delete state.data.grid.data[i][j];
                    this.repad(state);
                    state.data.bank.splice(state.presentation.selected[1]+1, 0, ...(dat?.value ? [dat] : []));
                  }
                  state.presentation.selected = null;
                }
                return state;
              });
            },
            "data-selected": shallowEqual(this.state.presentation.selected, ["grid", i, j])
          }, dat ? e(Drag, {className: "word tile", onDrop: this.drop(["grid", i, j]), onDrag: this.drag(["grid", i, j])}, dat.value) : e(Drag, {onDrop: this.drop(["grid", i, j])}))
        )
      )
    )));
    let bank = e('div', {key: "bank", className: "word bank"}, this.state.data.bank.map((letter, i) =>
      e('span', {
        key: i, className: "letter " + (letter ? "" : "empty"),
        onClick: () => {
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
              if (state.data.bank[i]?.value) {
                state.data.grid.data[state.presentation.selected[1]][state.presentation.selected[2]] = state.data.bank[i];
                this.repad(state);
                state.data.bank.splice(i, 1, ...(dat?.value ? [dat] : []));
              } else {
                delete state.data.grid.data[state.presentation.selected[1]][state.presentation.selected[2]];
                this.repad(state);
                state.data.bank.splice(i+1, 0, ...(dat?.value ? [dat] : []));
              }
              state.presentation.selected = null;
            }
            return state;
          });
        }, "data-selected": shallowEqual(this.state.presentation.selected, ["bank", i])
      }, letter ? e(Drag, {className: "word tile", onDrop: this.drop(["bank", i]), onDrag: this.drag(["bank", i])}, letter.value) : e(Drag, {onDrop: this.drop(["bank", i])}))
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
    this.ref = React.createRef();
    if (this.props.onDrop) {
      this.props.onDrop(this.ref);
    }
  }

  componentDidMount() {
    this.props.onDrop(this.ref);
  }
  componentDidUpdate() {
    this.props.onDrop(this.ref);
  }
  componentWillUnmount() {
    for (let l of this.state.listeners) {
      l();
    }
    this.props.onDrop();
  }

  getDragData(e, initial) {
    if (e.touches) {
      if (initial) {
        var touches = e.targetTouches;
      } else {
        var touches = Array.from(e.touches).filter(t => t.identifier === this.state.dragging.touch);
      }
      if (touches.length === 1) {
        var touch = touches[0];
        var dragging = {x: touch.pageX, y: touch.pageY, touch: touch.identifier};
      }
    } else {
      var dragging = {x: e.pageX, y: e.pageY};
    }
    return dragging;
  }

  start(dragging) {
    this.setState(() => {
      this.state.dragging = dragging;
      if (dragging.touch) {
        this.state.listeners.push(bodyListener("touchmove", e => this.move(this.getDragData(e))));
        this.state.listeners.push(bodyListener("touchend", e => this.end()));
      } else {
        this.state.listeners.push(bodyListener("mousemove", e => this.move(this.getDragData(e))));
        this.state.listeners.push(bodyListener("mouseup", e => this.end()));
      }
    });
  }
  move(dragging) {
    if (this.state.dragging) {
      this.setState(() => {
        this.state.x = dragging.x - this.state.dragging.x;
        this.state.y = dragging.y - this.state.dragging.y;
        return this.state;
      });
      if (this.props.onDrag) this.props.onDrag();
    }
  }
  end() {
    if (this.state.dragging) {
      this.setState(() => {
        this.state.dragging = null;
        this.state.x = 0;
        this.state.y = 0;
        for (let l of this.state.listeners) {
          l();
        }
        this.state.listeners = [];
        return this.state;
      });
      if (this.props.onDrag) this.props.onDrag(true);
    }
  }

  render() {
    return e('div', mergeProps({
      style: {
        transform: "translate(" + this.state.x + "px, " + this.state.y + "px)",
        zIndex: this.state.dragging ? 100 : 0,
        position: this.state.dragging ? "relative" : "",
        cursor: "pointer",
        touchAction: "none",
      },
      onMouseDown: e => this.start(this.getDragData(e, true)),
      onTouchStart: e => this.start(this.getDragData(e, true)),
      onMouseMove: e => this.move(this.getDragData(e, false)),
      onTouchMove: e => this.move(this.getDragData(e, false)),
      onMouseUp: e => this.end(),
      onTouchEnd: e => this.end(),
      ref: this.ref,
    }, this.props), this.props.children);
  }
}
