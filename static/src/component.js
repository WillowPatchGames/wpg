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

// Polyfill for smooth scrolling on iOS
import { seamless } from 'seamless-scroll-polyfill';
seamless({ duration: 150 });

const e = React.createElement;

const defaultGrid = new Grid();
defaultGrid.writeWord("APPLET", 3, 0, false, Letter);
defaultGrid.writeWord("TEACHER", 2, 4, true, Letter);
defaultGrid.writeWord("MAC", 5, 2, false, Letter);
defaultGrid.padding(5);

var PADDING = [7,7];
var SIZE = 35;
var ALLOW_SCALE = false;

class Game extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      presentation: {
        selected: null,
        last_selected: null,
        dropped: null,
        scale: 1,
        scaled: 1,
        size: null,
        unwords: [],
        readOnly: this.props.readOnly,
        drawing: false,
        discarding: [],
        padding: this.props.readOnly ? [0,0] : PADDING,
      },
      data: props.data,
    };
    this.state.data.grid.padding(this.state.presentation.padding);
    if (this.state.data.tiles && !this.state.presentation.readOnly) {
      var adder = this.state.data.tiles.onAdd;
      this.state.data.tiles.onAdd = (...tiles) => {
        adder.call(this.state.data.tiles, ...tiles);
        this.setState(this.repad.bind(this));
      };
    }
    this.droppoints = {};
    this.board = React.createRef();
    this.pending = {
      maintain: null,
      scroll: [0,0],
      smooth_scroll: [0,0],
    };
    this.unmount = ()=>{};
  }

  componentWillUnmount() {
    if (this.unmount) this.unmount();
    if (this.state.data.cancel) {
      this.state.data.cancel();
    }
  }

  componentDidMount() {
    if (!this.state.presentation.readOnly) {
      var size = window.getComputedStyle(this.board.current).getPropertyValue("--tile-size");
      this.setState(state => {
        state.presentation.size = size;
        return state;
      });
      if (!this.state.presentation.readOnly) {
        let release = [];
        release.push(listenIn("keydown", (e) => {
          var handled = [" ", "Spacebar", "Backspace", "Del", "Delete"];
          handled.push(...["Up","Down","Left","Right"].flatMap(a => [a,"Arrow"+a]));
          if (handled.includes(e.key)) {
            e.preventDefault();
          }
          switch (e.key) {
            // Arrows to navigate
            case "Up": case "ArrowUp":
              if (this.state.presentation.selected || this.state.presentation.last_selected) {
                let here = this.state.presentation.selected || this.state.presentation.last_selected;
                if (here[0] === "bank") {
                  let letters = this.state.data.grid.letterPoses();
                  let row = Math.max(...letters.map(({pos}) => pos[0]));
                  if (isFinite(row)) {
                    // Select a letter in the middle
                    let rowing = letters.filter(({pos}) => pos[0] === row);
                    let letter = rowing[Math.floor(rowing.length/2)];
                    this.select(["grid", ...letter.pos]);
                  } else {
                    // Select in center
                    this.select(["grid", Math.floor(this.state.data.grid.rows/2), Math.floor(this.state.data.grid.cols/2)]);
                  }
                } else if (here[0] === "grid") {
                  if (here[1] > 0) {
                    this.select([here[0], here[1]-1, here[2]]);
                  }
                }
              }
              break;
            case "Down": case "ArrowDown":
              if (this.state.presentation.selected || this.state.presentation.last_selected) {
                let here = this.state.presentation.selected || this.state.presentation.last_selected;
                if (here[0] === "grid") {
                  if (here[1] < this.state.data.grid.rows - 1) {
                    this.select([here[0], here[1]+1, here[2]]);
                  }
                }
              }
              break;
            case "Left": case "ArrowLeft":
              if (this.state.presentation.selected || this.state.presentation.last_selected) {
                let here = this.state.presentation.selected || this.state.presentation.last_selected;
                if (here[0] === "grid") {
                  if (here[2] > 0) {
                    this.select([here[0], here[1], here[2]-1]);
                  }
                } else if (here[0] === "bank") {
                  if (here[1] > 0) {
                    this.select([here[0], here[1]-1]);
                  }
                }
              }
              break;
            case "Right": case "ArrowRight":
              if (this.state.presentation.selected || this.state.presentation.last_selected) {
                let here = this.state.presentation.selected || this.state.presentation.last_selected;
                if (here[0] === "grid") {
                  if (here[2] < this.state.data.grid.cols - 1) {
                    this.select([here[0], here[1], here[2]+1]);
                  }
                } else if (here[0] === "bank") {
                  if (here[1] < this.state.data.bank.length - 1) {
                    this.select([here[0], here[1]+1]);
                  }
                }
              }
              break;
            default: break;
          }
        }, { passive: false }));
        release.push(listenIn("keyup", (e) => {
          let key = e.key.toUpperCase();
          // Places we can select:
          // - matching letters in the bank
          // - matching letters isolated on the grid
          let places = this.state.data.letterPoses(true).filter(({letter, pos}) => {
            if (String(letter).toUpperCase() !== key) return false;
            if (pos[0] === "grid") {
              if (this.state.data.get([pos[0], pos[1]-1, pos[2]]) || this.state.data.get([pos[0], pos[1], pos[2]-1]) ||
                  this.state.data.get([pos[0], pos[1]+1, pos[2]]) || this.state.data.get([pos[0], pos[1], pos[2]+1]))
                return false;
            }
            return true;
          }).map(({pos}) => pos);
          if (places.length) {
            let i = places.findIndex(pos => shallowEqual(pos, this.state.presentation.selected))+1;
            if (i === 0) {
              if (this.state.presentation.selected && this.state.presentation.selected[0] === "grid") {
                // Replace the one on the grid
                return this.interact(places[i], this.state.presentation.selected);
              } else {
                // Select the first slot
                return this.select(places[i]);
              }
            } else {
              // Cycle through the possible selections
              if (i === places.length) {
                return this.select(null);
              } else {
                return this.select(places[i]);
              }
            }
          }
          switch (e.key) {
            // Escape to cancel selection
            case "Esc": case "Escape":
              if (this.state.presentation.selected) {
                this.select(null);
              }
              break;
            // Delete to recall a tile
            case "Del": case "Delete":
            case "Backspace":
              if (this.state.presentation.selected) {
                this.recall(this.state.presentation.selected);
              }
              break;
            // Enter to draw
            case "Enter":
              this.draw();
              e.preventDefault();
              break;
            // Space to check words
            case " ": case "Spacebar":
              this.check();
              e.preventDefault();
              break;
            default: break;
          }
        }, { passive: false }));
        release.push(listenIn.call(document.defaultView, "resize", this.recalc.bind(this), { passive: true }));
        this.unmount = () => {
          for (let f of release) {
            f();
          }
        };
      }
    } else if (this.state.data.words) {
      this.check();
    }
  }
  componentDidUpdate() {
    if (this.pending.maintain) {
      let bb = this.pending.maintain.element()?.getBoundingClientRect();
      let parent = this.pending.maintain.parent || this.board.current;
      let adj = [this.pending.maintain.left - bb.left, this.pending.maintain.top - bb.top];
      if (adj[0] || adj[1]) {
        parent.scrollBy({
          left: adj[0],
          top: adj[1],
          behavior: this.pending.maintain.behavior,
        });
      }
      this.pending.maintain = null;
    }
    if (this.pending.scroll[0]) {
      this.board.current.scrollLeft += this.pending.scroll[0];
      this.pending.scroll[0] = 0;
    }
    if (this.pending.scroll[1]) {
      this.board.current.scrollTop += this.pending.scroll[1];
      this.pending.scroll[1] = 0;
    }
    if (this.pending.smooth_scroll[0] || this.pending.smooth_scroll[1]) {
      this.board.current.scrollBy({
        left: this.pending.smooth_scroll[0] || 0,
        top: this.pending.smooth_scroll[1] || 0,
        behavior: "smooth",
      });
      this.pending.smooth_scroll[0] = 0;
      this.pending.smooth_scroll[1] = 0;
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

  recalc() {
    if (!this.board.current || !this.droppoints[["grid",0,0]]) return;
    var prev = [...this.state.presentation.padding];
    var bb = this.board.current.getBoundingClientRect();
    var bb0 = this.droppoints[["grid",0,0]].ref.getBoundingClientRect();
    var next = [bb.height/bb0.height, bb.width/bb0.width].map(a => Math.max(Math.ceil((a-1)/2), 7));
    if (next[0] !== prev[0] || next[1] !== prev[1]) {
      //console.log(bb, bb0, prev, next);
      this.setState(state => {
        state.presentation.padding = next;
        return this.repad(state);
      });
    }
  }
  repad(state) {
    if (!state) state = this.state;
    let padding = [...this.state.presentation.padding];
    if (!state.data.grid.letterPoses().length) {
      padding[0] = padding[0]*2 + 1;
      padding[1] = padding[1]*2 + 1;
    }
    var adj = state.data.grid.padding(padding);
    if (false) {
      this.pending.scroll[0] += SIZE*adj[1];
      this.pending.scroll[1] += SIZE*adj[0];
    } else {
      let where =
        state.data.grid.letterPoses().concat([{pos:[Math.max(0, adj[0]), Math.max(0, adj[1])]}])
        .map(({pos}) => ["grid", ...pos])
        .filter(pos => this.droppoints[pos]?.ref && pos[1]-adj[0] < this.state.data.grid.rows && pos[2]-adj[0] < this.state.data.grid.cols)
        [0];
      if (where) {
        let tgt = [where[0], where[1]-adj[0], where[2]-adj[1]];
        //console.log(where, tgt, this.state.data.grid.rows, this.state.data.grid.cols);
        let bb = this.droppoints[where].ref.getBoundingClientRect();
        this.pending.maintain = {
          element: () => this.droppoints[tgt]?.ref,
          parent: this.board.current,
          left: bb.left,
          top: bb.top,
        };
      } else {
        console.log("Could not find suitable tile");
      }
    }
    if (state.presentation.selected && state.presentation.selected[0] === "grid") {
      state.presentation.selected[1] += adj[0];
      state.presentation.selected[2] += adj[1];
    }
    if (state.presentation.last_selected && state.presentation.last_selected[0] === "grid") {
      state.presentation.last_selected[1] += adj[0];
      state.presentation.last_selected[2] += adj[1];
    }
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
      } else if (shallowEqual(there, here) || (shallowEqual(here, ["recall"]) && shallowEqual(there, ["bank",""]))) {
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
    let amt = [0,0];
    if (here && here[0] === "grid") {
      let bb = this.droppoints[here].ref.getBoundingClientRect();
      // HACK: adjust for border
      bb.width += 1;
      bb.height += 1;
      let bbp = this.board.current.getBoundingClientRect();
      if (bbp.left > bb.left && bbp.right > bb.right) {
        amt[0] -= bbp.left - bb.left;
      } else if (bbp.right < bb.right && bbp.left < bb.left) {
        amt[0] += bb.right - bbp.right;
      }
      if (bbp.top > bb.top && bbp.bottom > bb.bottom) {
        amt[1] -= bbp.top - bb.top;
      } else if (bbp.bottom < bb.bottom && bbp.top < bb.top) {
        amt[1] += bb.bottom - bbp.bottom;
      }
      this.pending.smooth_scroll[0] += amt[0];
      this.pending.smooth_scroll[1] += amt[1];
    }
    this.setState(state => {
      state = Object.assign({}, state);
      state.presentation.selected = here;
      if (here) {
        state.presentation.last_selected = state.presentation.selected;
      }
      return state;
    });
  }

  recall(here, dropped) {
    this.interact(here, ["bank",""], dropped);
  }
  async discard(here, dropped) {
    if (here && this.state.data.get(here) && !this.state.presentation.discarding.includes(this.state.data.get(here))) {
      var letter = this.state.data.get(here);
      this.setState((state) => {
        state.presentation.selected = null;
        if (dropped) state.presentation.dropped = here;
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
    var noted = false;
    if (!this.state.data.bank.empty() || this.state.data.grid.components().length > 1) {
      console.log("You must connect all of your tiles together before drawing!");
      if (this.props.notify) {
        this.props.notify("You must connect all of your tiles together before drawing!", "error");
      }
      noted = true;
    }
    if ((unwords = await this.state.data.check()).length) {
      if (!noted && this.props.notify) {
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
    } else if (!noted) {
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
      return this.discard(here, dropped);
    } else if (here[0] === "discard") {
      return this.discard(there, dropped);
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
              unelevated: shallowEqual(this.state.presentation.selected, ["recall"]) || shallowEqual(this.state.presentation.selected, ["bank",""]),
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

function listenIn(ty, cb, opts) {
  var tgt = this || document;
  var listener = (...arg) => cb(...arg);
  tgt.addEventListener(ty, listener, opts);
  return (() => {
    tgt.removeEventListener(ty, listener, opts);
  });
};

var FRICTION = 3;
var FIXED = true;
var SCROLL_PARENT = true;
var SCROLL_TIMEOUT = 300;
var SCROLL_REPEAT = 150;
var SCROLL_AREA = 2;

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
    this.scrolling = {
      scrolling: false,
      timeout: null,
      parent: null,
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
      if (SCROLL_PARENT) {
        var parent = this.ref.current.parentElement;
        while (parent) {
          if (getComputedStyle(parent).overflow === "auto") {
            break;
          }
          parent = parent.parentElement;
        }
        this.scrolling.parent = parent;
      }
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
            listenIn("touchmove", e => this.move(this.getDragData(e)), { passive: false }),
            listenIn("touchend", e => this.end(), { passive: false }),
          ]);
        } else {
          state.listeners = this.state.listeners.concat([
            listenIn("mousemove", e => this.move(this.getDragData(e)), { passive: false }),
            listenIn("mouseup", e => this.end(), { passive: false }),
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
        var mx = state.x - x0;
        var my = state.y - y0;
        var clamp = (z,r) => Math.min(r, Math.max(-r, z));
        var dx = clamp(state.dx, Math.abs(mx)/FRICTION);
        var dy = clamp(state.dy, Math.abs(my)/FRICTION);
        state.dx -= dx;
        state.x += dx;
        state.dragging.x += dx;
        state.dy -= dy;
        state.y += dy;
        state.dragging.y += dy;

        this.managescroll(mx, my);

        return state;
      }, () => {
        this.props.onDrag("move", this.ref);
      });
    }
  }
  end() {
    if (this.state.dragging && this.props.onDrag) {
      this.scroll(false);
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
  managescroll(left, top) {
    if (!SCROLL_PARENT || !this.scrolling.parent) return;
    if (left) {
      left = this.inscroll("left") || this.inscroll("right");
    } else {
      left = this.scrolling.left;
    }
    if (top) {
      top = this.inscroll("top") || this.inscroll("bottom");
    } else {
      top = this.scrolling.top;
    }
    this.scrolling.left = left || 0;
    this.scrolling.top = top || 0;
    if (!left && !top) {
      this.scroll(false);
    } else {
      this.scroll(true);
    }
  }
  inscroll(area) {
    if (!SCROLL_PARENT || !this.scrolling.parent) return;
    var s = (area === "right" || area === "bottom") ? -1 : 1;
    var meas = (area === "top" || area === "bottom") ? "height" : "width";
    var bbp = this.scrolling.parent.getBoundingClientRect();
    var bb = this.ref.current.getBoundingClientRect();
    if (bbp[meas] <= 2*SCROLL_AREA*bb[meas]) return 0;
    if (s*bbp[area] > s*bb[area] + bb[meas]) return 0;
    if (s*bbp[area] + SCROLL_AREA*bb[meas] > s*bb[area])
      return -s*bb[meas];
    return 0;
  }
  scroll(doit) {
    if (!SCROLL_PARENT || !this.scrolling.parent) return;
    if (doit && (this.scrolling.left || this.scrolling.top)) {
      if (this.scrolling.timeout) return;
      if (this.scrolling.scrolling) {
        console.log("DOIT", this.scrolling.left, this.scrolling.top);
        this.scrolling.parent.scrollBy({
          left: this.scrolling.left,
          top: this.scrolling.top,
          behavior: "smooth"
        });
        this.scrolling.timeout = setTimeout(() => {
          this.scrolling.timeout = null;
          if (this.scrolling.scrolling) {
            console.log("RESCROLL");
            this.scroll(true);
          }
        }, SCROLL_REPEAT);
      } else {
        this.scrolling.timeout = setTimeout(() => {
          this.scrolling.scrolling = true;
          this.scrolling.timeout = null;
          console.log("SCROLL", this.scrolling);
          this.scroll(true);
        }, SCROLL_TIMEOUT);
      }
    } else {
      if (this.scrolling.timeout) {
        console.log("CLEAR");
        clearTimeout(this.scrolling.timeout);
        this.scrolling.timeout = null;
      }
      this.scrolling.scrolling = false;
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
