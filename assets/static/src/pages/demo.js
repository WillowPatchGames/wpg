// Library imports
import React from 'react';

import '@rmwc/button/styles';
import '@rmwc/checkbox/styles';
import '@rmwc/select/styles';
import '@rmwc/typography/styles';
import '@rmwc/textfield/styles';

import { Card, CardHand, CardHandImage, CardImage } from '../games/card.js';

function adj(val, adj, len, min) {
  if (!adj) return val;
  if (Array.isArray(len)) len = len.length;
  if (!len) return val;
  if (!min) min = 0;
  val += adj;
  while (val >= min+len) val -= len;
  while (val < min) val += len;
  return val;
}

class DemoGamePage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hand: new CardHand(Array.from(Array(13)).map((_,i) => new Card(i,1,+i+1))),
      selected: 0,
      id: 13,
    };
    this.move = this.move.bind(this);
    this.unlisten = [];
  }
  componentDidMount() {
    document.addEventListener("keydown", this.move);
    this.unlisten.push(() => document.removeEventListener("keydown", this.move));
  }
  componentWillUnmount() {
    for (let l of this.unlisten.splice(0,-1)) {
      l();
    }
  }
  move(e) {
    var update;
    switch (e.key) {
    case "ArrowLeft":
      update = state => {state.selected = adj(state.selected,-1,state.hand.cards)};
      break;
    case "ArrowRight":
      update = state => {state.selected = adj(state.selected,+1,state.hand.cards)};
      break;
    case "ArrowUp":
      update = state => {state.hand.cards[state.selected].suit.value = adj(state.hand.cards[state.selected].suit.value,+1,3,1)};
      break;
    case "ArrowDown":
      update = state => {state.hand.cards[state.selected].suit.value = adj(state.hand.cards[state.selected].suit.value,-1,3,1)};
      break;
    case "W":
      update = state => {state.hand.cards[state.selected].suit.value = adj(state.hand.cards[state.selected].suit.value,+1,3,1)};
      break;
    case "S":
      update = state => {state.hand.cards[state.selected].suit.value = adj(state.hand.cards[state.selected].suit.value,-1,3,1)};
      break;
    case "A":
      update = state => {state.hand.cards[state.selected].rank.value = adj(state.hand.cards[state.selected].rank.value,-1,13,1)};
      break;
    case "D":
      update = state => {state.hand.cards[state.selected].rank.value = adj(state.hand.cards[state.selected].rank.value,+1,13,1)};
      break;
    case "j":
      update = state => {state.hand.cards[state.selected].rank.value = 11};
      break;
    case "q":
      update = state => {state.hand.cards[state.selected].rank.value = 12};
      break;
    case "k":
      update = state => {state.hand.cards[state.selected].rank.value = 13};
      break;
    case "d":
      update = state => {state.hand.cards[state.selected].suit.value = 4};
      break;
    case "c":
      update = state => {state.hand.cards[state.selected].suit.value = 1};
      break;
    case "s":
      update = state => {state.hand.cards[state.selected].suit.value = 3};
      break;
    case "h":
      update = state => {state.hand.cards[state.selected].suit.value = 2};
      break;
    case "Enter":
      update = state => {
        var sel = state.hand.cards[state.selected];
        state.hand.cardSort(true,true);
        state.hand.cards.forEach((card,i) => {
          if (card === sel)
            state.selected = i;
        });
      };
      break;
    case "~":
      update = state => {state.hand.cards.forEach(card => {
        card.rank.value = 1+Math.floor(Math.random() * 13);
        card.suit.value = 1+Math.floor(Math.random() * 4);
      });};
      break;
    case "`":
      update = state => {let card = state.hand.cards[state.selected];
        card.rank.value = 1+Math.floor(Math.random() * 13);
        card.suit.value = 1+Math.floor(Math.random() * 4);
      };
      break;
    case "-": case "_":
      update = state => {
        if (state.hand.cards.length <= 1) return;
        state.hand.cards.splice(state.selected, 1);
        if (state.selected) state.selected -= 1;
      };
      break;
    case "+": case "=":
      update = state => {
        state.hand.cards.splice(state.selected, 1,
          state.hand.cards[state.selected],
          new Card(state.id+=1,1+Math.floor(Math.random() * 4),1+Math.floor(Math.random() * 13)),
        );
        state.selected+=1;
      };
      break;
    default:
      if (!isNaN(Number(e.key))) {
        var v = +e.key;
        if (!v) v = 10;
        update = state => {state.hand.cards[state.selected].rank.value = v};
      }
      break;
    }
    if (update) {
      e.preventDefault();
      this.setState(state => {
        return update(state) || state;
      });
    } else {
      console.log(e.key);
    }
  }
  render() {
    return <div>
      <h1>Demo</h1>
      <CardHandImage curve overlap>
        { this.state.hand.cards.map((card,i) =>
          <CardImage card={ card } key={ card.id }
            selected={ i === this.state.selected }
            onClick={() => this.setState(state => Object.assign(state, {selected:i}))}
            />
        ).concat([
          <CardImage key={ null } overlay={ <h3>Add card</h3> }
            onClick={() => this.setState(state => {
              state.hand.cards.push(new Card(state.id+=1,1+Math.floor(Math.random() * 4),1+Math.floor(Math.random() * 13)));
              return state;
            })}/>
        ])}
      </CardHandImage>
      <p>Select cards with Left and Right arrows.</p>
      <p>Number keys 1 (ace) through 0 (10) and (j)ack, (q)ueen, (k)ing to set rank. Increment with Shift+D and decrement with Shift+A</p>
      <p>Set suit of (c)lubs, (h)earts, (s)pades, (d)iamonds, or use Shift+W/Shift+S or Up and Down.</p>
      <p>Re-sort with Enter. Randomize selected card with backtick, randomize all cards with tilde.</p>
      <p>Add/remove cards with +/-.</p>
    </div>;
  }
}

export {
  DemoGamePage,
}
