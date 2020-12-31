import React from 'react';

import cards from '../images/cards/anglo.svg';

import mergeProps from 'react-merge-props';

function rev(d) {
  var r = {};
  for (let key in d) {
    r[d[key]] = key;
  }
  return r;
}

var suits = {
  "club": 0,
  "diamond": 1,
  "heart": 2,
  "spade": 3,
};
suits.rev = rev(suits);
var numbers = {
  "1": 0,
  "2": 1,
  "3": 2,
  "4": 3,
  "5": 4,
  "6": 5,
  "7": 6,
  "8": 7,
  "9": 8,
  "10": 9,
  "jack": 10,
  "queen": 11,
  "king": 12,
};
numbers.rev = rev(numbers);
var ungrid = (x,y) => {
  var suit = suits.rev[y];
  var number = numbers.rev[x];
  if (!suit) {
    if (x === 0) {
      suit = "black"; number = "joker";
    } else if (x === 1) {
      suit = "red"; number = "joker";
    } else {
      suit = number = "";
    }
  } else if (!number) {
    suit = number = "";
  }
  return { suit, number };
};
var card_dim = [202.5,315];

class CardImage extends React.Component {
  render() {
    var props = Object.assign({}, this.props);
    var scale = this.props.scale || 0.5; delete props.scale;
    var x_part = this.props.x_part || 1; delete props.x_part;
    var y_part = this.props.y_part || 1; delete props.y_part;
    var name = this.props.suit + "_" + this.props.number;
    var x = 0; var y = 0;
    if (numbers[this.props.number] !== undefined && suits[this.props.suit] !== undefined) {
      x = numbers[this.props.number] * -card_dim[0];
      y = suits[this.props.suit] * -card_dim[1];
    } else if (this.props.number === "joker" && ["black","red","none","fancy"].includes(this.props.suit)) {
      name = this.props.number + "_" + this.props.suit;
      x = (["red","fancy"].includes(this.props.suit) ? 1 : 0) * -card_dim[0];
      y = 4 * -card_dim[1];
    } else {
      name = "back";
      x = 2 * -card_dim[0];
      y = 4 * -card_dim[1];
    }
    var viewBox = [
      card_dim[0]*(x_part < 0 ? 1+x_part : 0),
      card_dim[1]*(y_part < 0 ? 1+y_part : 0),
      card_dim[0]*Math.abs(x_part),
      card_dim[1]*Math.abs(y_part),
    ];
    return <svg width={ card_dim[0]*scale*Math.abs(x_part) } height={ card_dim[1]*scale*Math.abs(y_part) } viewBox={ viewBox } {...props}>
      <use href={ cards+"#"+name} x={ x } y={ y }/>
    </svg>
  }
}

class CardHand extends React.Component {
  render() {
    var { cards, direction, ...props } = this.props;
    var selectable = cards.some(card => card.selected !== undefined && card.selected !== null);
    var myProps = {
      style: {
      },
    };
    if (selectable) myProps.style.marginTop = "20px";
    props = mergeProps(myProps, props);
    return (<div {...props}>
      {cards.map((card,i) =>
        <CardImage key={i} suit={ card.suit } number={ card.number }
          x_part={ i>0 ? -0 : 1 }
          style={{ transform: card.selected ? "translateY(-20px)" : "" }}
          onClick={ card.onClick }
        />
      )}
    </div>)
  };
}

class CardGamePage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {x:0,y:0};
    var toggle = i => ()=>{
      this.setState(state => {
        state.cards[i].selected = !state.cards[i].selected;
        return state;
      });
    };
    this.state.cards = [{selected:false,onClick:toggle(0)},{selected:false,onClick:toggle(1)}];
    this.calc_cards();
    this.listeners = [];
  }
  calc_cards() {
    for (let i in this.state.cards) {
      Object.assign(this.state.cards[i], ungrid(this.state.x+ +i, this.state.y));
    }
  }
  componentDidMount() {
    var keypress = e => {
      var key = e.key;
      this.setState(state => {
        switch (key) {
          case "w":
            state.y = Math.max(0, state.y-1); break;
          case "a":
            state.x = Math.max(0, state.x-1); break;
          case "s":
            state.y = Math.min(4, state.y+1); break;
          case "d":
            state.x = Math.min(12, state.x+1); break;
          default: break;
        }
        this.calc_cards();
        return state;
      });
    };
    document.addEventListener("keypress", keypress);
    this.listeners.push(() => document.removeEventListener("keypress", keypress));
  }
  componentWillUnmount() {
    for (let l of this.listeners.splice(0, this.listeners.length)) {
      l();
    }
  }
  render() {
    return (<>
      <CardHand cards={ this.state.cards }/>
    </>);
  }
}

export {
  CardGamePage,
};
