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

class CardSuit {
  static apiValueToString = {
    '0': 'none',
    '1': 'clubs',
    '2': 'hearts',
    '3': 'spades',
    '4': 'diamonds',
    '5': 'fancy',
  };

  static apiValueToImage = {
    '0': null,
    '1': "club",
    '2': "heart",
    '3': "spade",
    '4': "diamond",
    '5': null,
  };

  static FANCY = 5;

  constructor(value) {
    this.value = value;
  }

  toString() {
    return CardSuit.apiValueToString["" + this.value];
  }

  toImage() {
    return CardSuit.apiValueToImage["" + this.value];
  }

  serialize() {
    return this.value;
  }

  static deserialize(obj) {
    return new CardSuit(obj);
  }
}

class CardRank {
  static apiValueToString = {
    '0':  'none',
    '1':  'ace',
    '2':  '2',
    '3':  '3',
    '4':  '4',
    '5':  '5',
    '6':  '6',
    '7':  '7',
    '8':  '8',
    '9':  '9',
    '10': '10',
    '11': 'jack',
    '12': 'queen',
    '13': 'king',
    '14': 'joker',
  };

  static apiValueToImage = {
    '0':  "",
    '1':  "1",
    '2':  "2",
    '3':  "3",
    '4':  "4",
    '5':  "5",
    '6':  "6",
    '7':  "7",
    '8':  "8",
    '9':  "9",
    '10': "10",
    '11': "jack",
    '12': "queen",
    '13': "king",
    '14': "joker",
  };

  static ACE = 1;
  static JOKER = 14;

  constructor(value) {
    this.value = value;
  }

  toString() {
    return CardRank.apiValueToString["" + this.value];
  }

  toImage() {
    return CardRank.apiValueToImage["" + this.value];
  }

  serialize() {
    return this.value;
  }

  static deserialize(obj) {
    return new CardRank(obj);
  }
}

class Card {
  constructor(id, suit, rank) {
    if (id instanceof Card) {
      var { id, suit, rank } = id;
    }

    if (id !== undefined && id !== null && suit !== undefined && suit !== null && (rank === undefined || rank === null)) {
      rank = suit;
      suit = id;
      id = null;
    }

    if (id !== undefined && id !== null) {
      this.id = id;
    } else {
      this.id = null;
    }

    if (suit !== undefined && suit !== null) {
      if (suit instanceof CardSuit) {
        this.suit = new CardSuit(suit.value);
      } else {
        this.suit = new CardSuit(suit);
      }
    } else {
      this.suit = null;
    }

    if (rank !== undefined && rank !== null) {
      if (rank instanceof CardRank) {
        this.rank = new CardRank(rank.value);
      } else {
        this.rank = new CardRank(rank);
      }
    } else {
      this.rank = null;
    }
  }

  compareTo(other, by_suit, ace_high) {
    if (this.suit.value === other.suit.value && this.rank.value === other.rank.value) {
      return 0;
    }

    // Jokers are equal and high.
    if (this.rank.value === CardRank.JOKER && other.rank.value === CardRank.JOKER) {
      return 0;
    }
    if (this.rank.value === CardRank.JOKER) {
      return 1;
    }
    if (other.rank.value === CardRank.JOKER) {
      return -1;
    }

    if (by_suit) {
      // Otherwise, traditional sorting will work well.
      if (this.suit.value < other.suit.value) {
        return -1;
      }

      if (this.suit.value > other.suit.value) {
        return 1;
      }
    }

    if (ace_high) {
      // Aces likewise are equal and high. We already know we have equal suits
      // here.
      if (this.rank.value === CardRank.ACE && other.rank.value === CardRank.ACE) {
        return 0;
      }

      if (this.rank.value === CardRank.ACE) {
        return 1;
      }

      if (other.rank.value === CardRank.ACE) {
        return -1;
      }
    }

    if (this.rank.value < other.rank.value) {
      return -1;
    }

    if (this.rank.value > other.rank.value) {
      return 1;
    }

    return 0;
  }

  toString() {
    if (this.rank.value === CardRank.JOKER) {
      if (this.suit.value === CardSuit.FANCY) {
        return "special joker";
      } else {
        return "joker";
      }
    } else {
      return this.rank.toString() + " of " + this.suit.toString();
    }
  }

  toImage(props) {
    return <CardImage suit={ this.suit.toImage() } rank={ this.rank.toImage() } {...props} />;
  }

  serialize() {
    return {
      'id': null,
      'suit': this.suit.value,
      'rank': this.rank.value,
    };
  }

  static deserialize(obj) {
    var id = 'id' in obj ? obj['id'] : null;
    var suit = 'suit' in obj ? obj['suit'] : null;
    var rank = 'rank' in obj ? obj['rank'] : null;

    return new Card(id, suit, rank)
  }
}

var suits = {
  "club": 0,
  "diamond": 1,
  "heart": 2,
  "spade": 3,
};
suits.rev = rev(suits);
var ranks = {
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
ranks.rev = rev(ranks);
var ungrid = (x,y) => {
  var suit = suits.rev[y];
  var rank = ranks.rev[x];
  if (!suit) {
    if (x === 0) {
      suit = "black"; rank = "joker";
    } else if (x === 1) {
      suit = "red"; rank = "joker";
    } else {
      suit = rank = "";
    }
  } else if (!rank) {
    suit = rank = "";
  }
  return { suit, rank };
};
var card_dim = [202.5,315];

class CardImage extends React.Component {
  render() {
    var props = Object.assign({}, this.props);
    var scale = this.props.scale || 0.5; delete props.scale;
    var x_part = this.props.x_part || 1; delete props.x_part;
    var y_part = this.props.y_part || 1; delete props.y_part;
    var name = this.props.suit + "_" + this.props.rank;
    var x = 0; var y = 0;
    if (ranks[this.props.rank] !== undefined && suits[this.props.suit] !== undefined) {
      x = ranks[this.props.rank] * -card_dim[0];
      y = suits[this.props.suit] * -card_dim[1];
    } else if (this.props.rank === "joker" && ["black","red","none","fancy"].includes(this.props.suit)) {
      name = this.props.rank + "_" + this.props.suit;
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

class CardHand {
  constructor(cards) {
    this.cards = [...cards];
  }

  findCardIndex(id) {
    for (let index in this.cards) {
      if (this.cards[index] === id) {
        return index;
      }
    }

    return null;
  }

  findCard(suit, rank) {
    for (let card of this.cards) {
      if (card.suit === suit && card.rank === rank) {
        return card.index;
      }
    }

    return null;
  }

  toImage(mapper, props) {
    var cards = this.cards;
    if (mapper) {
      cards = [];
      this.cards.forEach((v,i,vs) => {
        var c = new Card(v);
        cards[i] = mapper(c,i,vs)||c;
      });
    }
    var { direction, ...props } = (props || {});
    var selectable = cards.some(card => card.selected !== undefined && card.selected !== null);
    var myProps = {
      style: {
      },
    };
    if (selectable) myProps.style.marginTop = "20px";
    props = mergeProps(myProps, props);
    return (<div {...props}>
      {cards.map((card,i) =>
        card.toImage({
          key: i,
          x_part: i>0 ? -0 : 1,
          style: { transform: card.selected ? "translateY(-20px)" : "" },
          onClick: card.onClick,
        })
      )}
    </div>);
  }

  cardSort(by_suit, ace_high) {
    let sorted = [];

    // Insertion sort
    for (let card of this.cards) {
      var index = 0;
      while (index < sorted.length && card.compareTo(sorted[index], by_suit, ace_high) <= 0) {
        index++
      }

      sorted.splice(index, 0, card);
    }

    this.cards = sorted;
  }

  serialize() {
    var result = [];
    for (let card of this.cards) {
      result.push(card.serialize);
    }
    return result;
  }

  static deserialize(cards) {
    var our_cards = [];
    for (let raw_card of cards) {
      let card = Card.deserialize(raw_card);
      our_cards.push(card);
    }

    return new CardHand(our_cards);
  }
}

export {
  CardHand,
  Card,
};
