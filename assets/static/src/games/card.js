import React from 'react';

import cards from '../images/cards/anglo.svg';
import logosrc from '../images/logo.svg';

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
    '5': "fancy",
  };

  static apiValueToUnicode = {
    '0': null,
    '1': "♣",
    '2': "♥",
    '3': "♠",
    '4': "♦",
    '5': null,
  };

  static apiValueToColor = {
    '0': null,
    '1': "black",
    '2': "red",
    '3': "black",
    '4': "red",
    '5': null,
  }

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

  toUnicode() {
    return CardSuit.apiValueToUnicode["" + this.value];
  }

  toColor() {
    return CardSuit.apiValueToColor["" + this.value];
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
      ({ id, suit, rank } = id);
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
    return <CardImage card={ this } {...props}/>;
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
var card_dim = [202.5,315];

class CardImage extends React.Component {
  render() {
    var {
      scale, x_part, y_part,
      card, suit, rank,
      underlay, overlay, annotation, badge,
      className, ...props } = this.props;
    if (className) {
      className = " " + className;
    } else {
      className = "";
    }
    if (!scale) scale = 0.5;
    if (!x_part) x_part = 1;
    if (!y_part) y_part = 1;
    if (card) {
      suit = card.suit?.toImage() || suit;
      rank = card.rank?.toImage() || rank;
    }
    var name = suit + "_" + rank;

    var x = 0; var y = 0;
    if (ranks[rank] !== undefined && suits[suit] !== undefined) {
      x = ranks[rank] * -card_dim[0];
      y = suits[suit] * -card_dim[1];
    } else if (rank === "joker" && ["black","red","none","fancy", null, undefined].includes(suit)) {
      var joker_suit = ["red","fancy"].includes(suit) ? "red" : "black";
      name = rank + "_" + joker_suit;
      x = (joker_suit === "red" ? 1 : 0) * -card_dim[0];
      y = 4 * -card_dim[1];
    } else if (rank === "blank" || rank === "logo" || (rank !== "back" && overlay)) {
      name = "card_border";
    } else {
      name = "back";
      x = 2 * -card_dim[0];
      y = 4 * -card_dim[1];
    }

    if (rank === "logo") {
      var logo = <img style={{ width: "75%", paddingTop: "15%" }} src={ logosrc } alt="WillowPatchGames logo"/>;
      underlay = underlay ? <>{ logo }{ underlay }</> : logo;
    }

    if (underlay) {
      underlay = <div className="card-overlay centered">{ underlay }</div>;
    } else {
      underlay = <></>;
    }
    if (overlay) {
      overlay = <div className="card-overlay centered">{ overlay }</div>;
    } else {
      overlay = <></>;
    }
    if (annotation) {
      className += " annotated";
      annotation = <div className="card-overlay card-annotation">{ annotation }</div>;
    } else {
      annotation = <></>;
    }
    if (badge) {
      badge = <div className="card-overlay card-badge">{ badge }</div>;
    } else {
      badge = <></>;
    }

    var viewBox = [
      card_dim[0]*(x_part < 0 ? 1+x_part : 0),
      card_dim[1]*(y_part < 0 ? 1+y_part : 0),
      card_dim[0]*Math.abs(x_part),
      card_dim[1]*Math.abs(y_part),
    ];
    var borders = {};
    if (y_part < 1 && y_part > -1) {
      if (y_part >= 0) {
        borders.borderBottomLeftRadius = 0;
        borders.borderBottomRightRadius = 0;
      }
      if (y_part <= 0) {
        borders.borderTopLeftRadius = 0;
        borders.borderTopRightRadius = 0;
      }
    }
    if (x_part < 1 && x_part > -1) {
      if (x_part >= 0) {
        borders.borderTopLeftRadius = 0;
        borders.borderBottomLeftRadius = 0;
      }
      if (x_part <= 0) {
        borders.borderTopRightRadius = 0;
        borders.borderBottomRightRadius = 0;
      }
    }

    return <div className={ "card" + className } style={ borders }>
      { annotation }
      <svg className="card-image"
        width={ card_dim[0]*scale*Math.abs(x_part) }
        height={ card_dim[1]*scale*Math.abs(y_part) }
        viewBox={ viewBox } {...props}>
        <use href={ cards+"#"+name} x={ x } y={ y }/>
      </svg>
      { overlay }
      { underlay }
      { badge }
    </div>;
  }
}

class CardHand {
  constructor(cards) {
    this.cards = [...cards];
  }
  copy() {
    return new CardHand(this.cards);
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

  toImage(mapper, props, annotations) {
    var cards = this.cards;
    if (mapper && typeof mapper !== 'function' && !props) {
      props = mapper;
      mapper = props.mapper;
    }
    if (annotations) {
      var oldMapper = mapper || (c => c);
      mapper = (c,i,vs) => {
        var r = oldMapper(c,i,vs);
        if (r) r.annotation = annotations[i];
        return r;
      };
    }
    if (mapper) {
      cards = [];
      this.cards.forEach((v,i,vs) => {
        var c = new Card(v);
        cards[i] = mapper(c,i,vs)||c;
      });
    }
    return <CardHandImage cards={ cards } { ...props }/>
  }

  cardSortIf(cond) {
    return cond ? ((...arg) => this.copy().cardSort(...arg)) : (() => this);
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
    return this;
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

  // Sort specified cards/ids to front of hand.
  sortToFront(cards) {
    // List of {c,i} = cards c with their indices i
    var indexed = this.cards.map((c,i) => ({c,i}));
    // Find the cards we are going to sort to front
    // in their requested order
    var sorted = cards.flatMap(card =>
      indexed.filter(({c}) => c === card || c.id === card)
    );
    // Dedupe (just in case)
    sorted = sorted.filter((c,i,cs) => cs.indexOf(c) === i);
    var added = sorted.map(({c}) => c);
    var removed = sorted.map(({i}) => i);
    // Sort by decreasing index and remove
    for (let i of removed.sort((a,b) => b-a)) {
      this.cards.splice(i, 1);
    }
    // Add them back in
    this.cards.splice(0, 0, ...added);
    return this;
  }

  setCardsTo(goal) {
    if (!goal) {
      this.cards.splice(0, this.cards.length);
      return this;
    }
    if (!(goal instanceof CardHand)) {
      throw new Error("deserialize cards first!");
    }
    // Shallow copy since we will be removing elements as we see them
    var added = goal.cards.slice();
    // Record of removed indices
    var removed = [];
    for (let [j, card] of this.cards.entries()) {
      // Look up by id
      var i = added.findIndex(c => c.id === card.id);
      if (i >= 0) {
        // Reset suit and rank, just in case
        card.suit.value = added[i].suit.value;
        card.rank.value = added[i].rank.value;
        // Remove from added, since it already exists in the hand
        added.splice(i, 1);
      } else {
        // Add index to record of removed cards
        // (unshift means it occurs in descending order)
        removed.unshift(j);
      }
    }
    // Since these are descending, we can just remove them without worrying
    // about indices shifting
    for (let j of removed) {
      this.cards.splice(j, 1);
    }
    // Finally we add the new cards at the end of the hand
    this.cards.push(...added);
    return this;
  }
}

class CardHandImage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      action_open: false,
    };
  }
  render() {
    var { cards, children, overlap, curve, scale, ...props } = (this.props || {});
    scale = scale || 0.5;
    var length = cards?.length || children?.length || 0;
    if (typeof overlap !== 'number') overlap = overlap ? 0.75 : 0;
    if (typeof curve !== 'number') curve = curve ? 3 : 0;
    curve *= length;
    var curve_norm = curve ? Math.sin(curve*Math.PI/180) : 0;
    var selectable =
      (cards && cards.some(card => card.selected !== undefined && card.selected !== null))
      || (children && children.some(card => card.props.selected !== undefined && card.props.selected !== null));
    var myProps = {
      style: {
      },
    };
    var marginTop = 0;
    var marginBottom = 0;
    var padding = 0;
    var cardSelectDist = selectable ? 40*scale : 0;
    var cardSelectableTop = 0;
    var cardCurveBottom = 0;
    var cardCurvePadding = 0;
    var cardOverlapPadding = 0;
    if (selectable) {
      cardSelectableTop = cardSelectDist*1.2;
      marginTop += cardSelectableTop;
    }
    if (curve) {
      cardCurveBottom = (length+4)*35*scale*curve_norm*(1.1-overlap);
      marginBottom += cardCurveBottom;
      cardCurvePadding = (card_dim[1]+cardSelectDist*1.2)*scale*curve_norm/2;
      padding += cardCurvePadding;
    }
    if (overlap) {
      cardOverlapPadding = overlap*card_dim[0]*scale/2;
      padding += cardOverlapPadding;
    }
    Object.assign(myProps.style, {
      "--card-selectable-top": cardSelectableTop+"px",
      "--card-curve-bottom": cardCurveBottom+"px",
      "--card-curve-padding": cardCurvePadding+"px",
      "--card-overlap-padding": cardOverlapPadding+"px",
      "--card-select-dist": cardSelectDist+"px",
    });

    if (marginTop) myProps.style.marginTop = marginTop + "px";
    if (marginBottom) myProps.style.marginBottom = marginBottom + "px";
    if (padding) {
      myProps.style.paddingLeft = padding + "px";
      myProps.style.paddingRight = padding + "px";
    }

    var transform = (card,i) => {
      if (!curve && !selectable) return "";
      var tr = "";
      if (curve && length > 1) {
        var mid = (length-1)/2;
        var j = i/mid - 1;
        tr += "translateY(" + ((1-Math.cos(j)) * length*1.6*curve*scale*(1-overlap)) + "px) ";
        tr += "rotate(" + (j * curve) + "deg) ";
      }
      if (card.selected) {
        var sel = card.selected;
        if (card.selected === true) sel = 1;
        tr += "translateY(-" + (sel*cardSelectDist) + "px) ";
      }
      if (!tr) return "translate(0,0)"; // push a transform to avoid z-index issues
      return tr;
    };

    if (!children) {
      children = cards.map((card,i) => card.toImage({
        card: card,
        scale: scale,
        onClick: card.onClick,
        annotation: card.annotation,
        selected: card.selected,
      }));
    }

    return (<div className="card-hand" {...mergeProps(myProps, props)}>
      {children.map((child,i) =>
        <div key={ child.props.card?.id ? "card"+child.props.card?.id : "idx"+i }
          className={ "card-holder"+(child.props.selected ? " selected" : "") }
          style={{
            transform: transform(child.props,i),
            marginLeft: overlap ? -overlap*card_dim[0]*scale/2 : 0,
            marginRight: overlap ? -overlap*card_dim[0]*scale/2 : 0,
            "--card-select-dist": child.props.selected && child.props.selected !== true ? (child.props.selected * cardSelectDist) + "px" : undefined,
          }}>{ child }</div>
      )}
    </div>);
  }
}

export {
  CardHand,
  CardHandImage,
  CardImage,
  Card,
  CardSuit,
  CardRank,
};
