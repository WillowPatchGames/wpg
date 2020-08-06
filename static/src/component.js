import React from 'react';
import shallowEqual from 'shallow-eq';
import mergeProps from 'react-merge-props';

import './main.scss';

import { Button } from '@rmwc/button';
import { CircularProgress } from '@rmwc/circular-progress';

import {
  Letter,
  Grid,
} from './game.js';

const e = React.createElement;

const defaultGrid = new Grid();
defaultGrid.writeWord("APPLET", 3, 0, false, Letter);
defaultGrid.writeWord("TEACHER", 2, 4, true, Letter);
defaultGrid.writeWord("MAC", 5, 2, false, Letter);
defaultGrid.padding(5);

var PADDING = [8,14];
var SIZE = 35;
var ALLOW_SCALE = false;

class Game extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      presentation: {
        selected: null,
        dropped: null,
        scale: 1,
        scaled: 1,
        size: null,
        unwords: [],
        readOnly: this.props.readOnly,
        drawing: false,
        discarding: [],
      },
      data: props.data,
    };
    if (this.state.data.tiles && !this.state.presentation.readOnly) {
      var adder = this.state.data.tiles.onAdd;
      this.state.data.tiles.onAdd = (...tiles) => {
        adder.call(this.state.data.tiles, ...tiles);
        this.setState(state => this.repad(state));
      };
    }
    this.droppoints = {};
    this.board = React.createRef();
    this.pending = {
      scroll: [0,0],
    };
    if (!this.state.presentation.readOnly) {
      this.kb1 = bodyListener("keydown", (e) => {
        var handled = [" ", "Spacebar", "Backspace", "Del", "Delete"];
        if (handled.includes(e.key)) {
          e.preventDefault();
        }
      });
      this.kb2 = bodyListener("keyup", (e) => {
        if (this.state.presentation.selected && this.state.presentation.selected[0] === "grid") {
          for (let i in this.state.data.bank) {
            if (String(this.state.data.bank[i]).toUpperCase() === e.key.toUpperCase()) {
              this.interact(["bank",+i], this.state.presentation.selected);
              return;
            }
          }
        } else if (!this.state.presentation.selected) {
          for (let i in this.state.data.bank) {
            if (String(this.state.data.bank[i]).toUpperCase() === e.key.toUpperCase()) {
              this.setState(state => {
                state.presentation.selected = ["bank",+i];
                return state;
              });
              return;
            }
          }
        }
        switch (e.key) {
          case "Esc": case "Escape":
            if (this.state.presentation.selected) {
              this.setState(state => {
                return Object.assign({}, state, {
                  presentation: Object.assign({}, state.presentation, { selected: null}),
                });
              });
            }
            break;
          case "Del": case "Delete":
          case "Backspace":
            if (this.state.presentation.selected) {
              this.recall(this.state.presentation.selected);
            }
            break;
          case "Enter":
            this.draw();
            e.preventDefault();
            break;
          case " ": case "Spacebar":
            this.check();
            e.preventDefault();
            break;
          default: break;
        }
      });
    } else {
      this.kb1 = this.kb2 = () => {};
    }
  }

  componentWillUnmount() {
    this.kb1();
    this.kb2();
    if (this.state.data.cancel) {
      this.state.data.cancel();
    }
  }

  componentDidMount() {
    if (!this.state.presentation.readOnly) {
      this.setState(this.repad);
      var size = window.getComputedStyle(this.board.current).getPropertyValue("--tile-size");
      this.setState(state => {
        state.presentation.size = size;
        return state;
      });
    } else if (this.state.data.words) {
      this.check();
    }
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

  droppable(where, area) {
    return (ref) => {
      if (ref) {
        this.droppoints[where] = {ref, where, area};
      } else {
        delete this.droppoints[where];
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
      for (let there in this.droppoints) {
        var testing = this.droppoints[there].ref.getBoundingClientRect();
        var parent = this.droppoints[there].ref.parentElement;
        while (testing && parent) {
          if (getComputedStyle(parent).overflow === "auto") {
            testing = this.includes(parent.getBoundingClientRect(), testing);
          }
          parent = parent.parentElement;
        }
        if (!testing) continue;
        var d = this.intersect(here, testing);
        if (d !== undefined) {
          if (this.droppoints[there].area) {
            areas.push(this.droppoints[there].where);
          } else if (d > D) {
            D = d; res = this.droppoints[there].where;
          }
        }
      }
      if (!res && areas.length === 1) {
        res = areas[0];
      }
      if (status === "end" && res) {
        if (!shallowEqual(res, where)) {
          this.interact(where, res, true);
        }
      }
      return res;
    };
  }

  handler(here) {
    if (this.state.presentation.readOnly) return null;
    return () => {
      if (shallowEqual(here, this.state.presentation.dropped)) {
        this.setState(state => {
          state.presentation.dropped = null;
          return state;
        });
        return;
      }
      let there = this.state.presentation.selected;
      if (!there) {
        this.select(here);
      } else if (shallowEqual(there, here)) {
        this.select(null);
      } else if (there.length === 1 && here.length === 1) {
        this.select(here);
      } else if (there.length === 1) {
        if (this.state.data.get(here)) {
          this.interact(here, there);
        }
      } else if (here.length === 1) {
        if (this.state.data.get(there)) {
          this.interact(here, there);
        }
      } else if (!this.state.data.get(here) && !this.state.data.get(there)) {
        this.select(here);
      } else {
        this.interact(here, there);
      }
    };
  }
  select(here) {
    this.setState(state => {
      state = Object.assign({}, state);
      state.presentation.selected = here;
      return state;
    });
  }

  recall(here, dropped) {
    this.interact(here, ["bank",""], dropped);
  }
  async discard(here) {
    if (here && this.state.data.get(here) && !this.state.presentation.discarding.includes(this.state.data.get(here))) {
      var letter = this.state.data.get(here);
      this.setState((state) => {
        state.presentation.selected = null;
        state.presentation.discarding.push(letter);
        return state;
      });
      try {
        await this.state.data.discard(here);
      } finally {
        this.setState((state) => {
          var i = state.presentation.discarding.indexOf(letter);
          if (i > -1) {
            state.presentation.discarding.splice(i, 1);
          }
          return state;
        });
      }
    }
  }
  async draw() {
    if (this.state.presentation.drawing) return;
    var unwords;
    if (!this.state.data.bank.empty() || this.state.data.grid.components().length > 1) {
      console.log("You must connect all of your tiles together before drawing!");
      if (this.props.notify) {
        this.props.notify("You must connect all of your tiles together before drawing!", "error");
      }
    } else if ((unwords = await this.state.data.check()).length) {
      if (this.props.notify) {
        if (unwords.length === 1) {
          this.props.notify('"' + unwords[0] + '"' + " is not a valid word!", "error");
        } else {
          this.props.notify("You have invalid words on the board", "error");
        }
      }
      console.log("Invalid words: ", unwords.map(String));
      this.setState((state) => {
        state.presentation.unwords = unwords;
        state.presentation.selected = null;
        return state;
      });
    } else {
      this.setState(state => {
        state.presentation.selected = null;
        state.presentation.drawing = true;
        return state;
      });
      try {
        await this.state.data.draw();
      } finally {
        // NOTE: this technically leaks, and may execute after the component unmounts (especially on game over events)
        this.setState(state => {
          state.presentation.drawing = false;
          return state;
        });
      }
    }
  }
  async check() {
    var unwords = await this.state.data.check();
    if (unwords.length) console.log("Invalid words: ", unwords.map(String));
    this.setState((state) => {
      state.presentation.unwords = unwords;
      return state;
    });
  }

  interact(here,there,dropped) {
    if (there[0] === "discard") {
      return this.discard(here);
    } else if (here[0] === "discard") {
      return this.discard(there);
    } else if (there[0] === "recall") {
      if (here[0] === "bank") {
        this.select(null);
        return;
      } else if (!this.state.data.get(here)) {
        return;
      }
      there = ["bank",""];
    } else if (here[0] === "recall") {
      if (there[0] === "bank") {
        this.select(null);
        return;
      } else if (!this.state.data.get(there)) {
        return;
      }
      here = ["bank",""];
    }
    this.setState(state => {
      state = Object.assign({}, state);
      if (dropped) state.presentation.dropped = here;
      var ALEX = true;
      if (ALEX && here[0] === "bank" && there[0] === "grid" && state.data.get(there)) {
        state.presentation.selected = here;
      } else if (ALEX && there[0] === "bank" && here[0] === "grid" && state.data.get(here)) {
        state.presentation.selected = there;
      } else {
        state.presentation.selected = null;
      }
      state.data.swap(here,there);
      state = this.repad(state);
      return state;
    });
  }

  render() {
    let grid = e('div', {key: "grid", className: "board", ref: this.board}, e('table',
      {
        className: "word grid" + (this.state.presentation.readOnly ? " read-only" : ""),
        style: {
          transform: FIXED ? "none" : "scale(" + this.state.presentation.scale + ")",
          "--tile-size": FIXED && this.state.presentation.size
            ? "calc(" + this.state.presentation.size + " * " + this.state.presentation.scale + ")"
            : "",
        },
        onTouchMove: e => {
          var scale = e.nativeEvent.scale;
          if (ALLOW_SCALE && scale && scale !== 1) {
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
            className: (dat ? (this.state.presentation.unwords.filter(w => w.present() && w.includes(i, j, this.state.data.grid)).length ? "unword" : "") : "empty") + (this.state.presentation.readOnly ? " read-only" : "") + (this.state.presentation.discarding.includes(dat) ? " discarding" : ""),
            ref: this.droppable(["grid",i,j]),
            style: FIXED ? {} : {"position":"relative"},
            key: j, onClick: this.handler(["grid",i,j]),
            "data-selected": shallowEqual(this.state.presentation.selected, ["grid", i, j]),
          }, this.state.presentation.readOnly ? e('div', {className: "read-only"}, dat ? String(dat) : "\xa0") : (dat ? e(Drag, {className: "word tile", onDrag: this.draggable(["grid", i, j])}, String(dat)) : e('div', {}, "\xa0")))
        )
      )
    ))));
    let bank = e('div', {key: "bank", className: "word bank", ref: this.droppable(["bank",""], true)},
      [
        e('div', {key: "letters", className: "letters"}, this.state.data.bank.map((letter, i) =>
          e('span', {
            key: i, className: "letter" + (letter ? (this.state.presentation.readOnly ? "" : " draggable") : " empty") + (this.state.presentation.discarding.includes(letter) ? " discarding" : ""),
            ref: this.droppable(["bank", i]),
            onClick: this.handler(["bank",i]),
            "data-selected": shallowEqual(this.state.presentation.selected, ["bank", i]),
          }, this.state.presentation.readOnly ? e('div', {className: "read-only"}, String(letter)) : (letter ? e(Drag, {className: "word tile", onDrag: this.draggable(["bank", i])}, String(letter)) : e(Drag, {onDrag: this.draggable(["bank", i])})))
        )),
        this.state.presentation.readOnly ? null : e('div', {key: "after", className: "actions"},
          [
            e(Button, {
              raised: true,
              key: "check",
              theme: ['secondaryBg', 'onSecondary'],
              onClick: this.check.bind(this),
            }, "Check"),
            e(Button, {
              raised: true,
              disabled: !this.state.data.bank.empty() || this.state.data.grid.components().length > 1,
              key: "draw",
              onClick: this.draw.bind(this),
              icon: this.state.presentation.drawing ? <CircularProgress theme="secondary"/> : null,
            }, "Draw"),
            e(Button, {
              outlined: true,
              key: "recall",
              unelevated: shallowEqual(this.state.presentation.selected, ["recall"]),
              ref: this.droppable(["recall"]),
              onClick: this.handler(["recall"]),
            }, "Recall"),
            e(Button, {
              outlined: true,
              danger: true,
              key: "discard",
              unelevated: shallowEqual(this.state.presentation.selected, ["discard"]),
              ref: this.droppable(["discard"]),
              onClick: this.handler(["discard"]),
            }, "Discard"),
          ]
        )
      ]
    );
    return e('div', {className: "game-component"}, [grid, bank]);
  }
}

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

  setStateCpy(fn) {
    this.setState(state => fn(Object.assign({}, state)));
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
        dragging = {x: touch.clientX, y: touch.clientY, touch: touch.identifier};
      }
      e.preventDefault();
    } else if (initial || !this.state.dragging || this.state.dragging.touch === undefined) {
      dragging = {x: e.clientX, y: e.clientY};
    }
    return dragging;
  }

  start(dragging) {
    if (!dragging) return;
    if (this.props.onDrag) {
      this.setState(state => {
        state = Object.assign({}, state);
        var bb = this.ref.current.getBoundingClientRect();
        if (FIXED) {
          state.x0 = bb.left;
          state.y0 = bb.top;
        } else {
          state.x0 = this.ref.current.offsetTop;
          state.y0 = this.ref.current.offsetLeft;
        }
        state.dragging = dragging;
        var cx = (bb.left + bb.right)/2;
        var cy = (bb.top + bb.bottom)/2;
        state.dx = cx - dragging.x;
        state.dy = cy - dragging.y;
        if (dragging.touch !== undefined) {
          state.listeners = this.state.listeners.concat([
            bodyListener("touchmove", e => this.move(this.getDragData(e))),
            bodyListener("touchend", e => this.end()),
          ]);
        } else {
          state.listeners = this.state.listeners.concat([
            bodyListener("mousemove", e => this.move(this.getDragData(e))),
            bodyListener("mouseup", e => this.end()),
          ]);
        }
        this.props.onDrag("start", this.ref);
        return state;
      });
    }
  }
  move(dragging) {
    if (!dragging) return;
    if (this.state.dragging && this.props.onDrag) {
      this.setState(state => {
        state = Object.assign({}, state);
        var x0 = state.x; var y0 = state.y;
        state.x = dragging.x - state.dragging.x;
        state.y = dragging.y - state.dragging.y;
        var clamp = (z,r) => Math.min(r, Math.max(-r, z));
        var dx = clamp(state.dx, Math.abs(state.x - x0)/FRICTION);
        var dy = clamp(state.dy, Math.abs(state.y - y0)/FRICTION);
        state.dx -= dx;
        state.x += dx;
        state.dragging.x += dx;
        state.dy -= dy;
        state.y += dy;
        state.dragging.y += dy;
        return state;
      }, () => {
        this.props.onDrag("move", this.ref);
      });
    }
  }
  end() {
    if (this.state.dragging && this.props.onDrag) {
      this.setState(state => {
        state = Object.assign({}, state);
        state.dragging = null;
        state.x = 0;
        state.y = 0;
        state.dx = 0;
        state.dy = 0;
        state.x0 = 0;
        state.y0 = 0;
        for (let l of this.state.listeners) {
          l();
        }
        state.listeners = [];
        this.props.onDrag("end", this.ref);
        return state;
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

export {
  Game,
  Drag,
}
