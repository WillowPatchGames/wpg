import React from 'react';

import '../../main.scss';

import { Avatar } from '@rmwc/avatar';
import '@rmwc/avatar/styles';
import { Button } from '@rmwc/button';
import '@rmwc/button/styles';
import { IconButton } from '@rmwc/icon-button';
import '@rmwc/icon-button/styles';
import * as c from '@rmwc/card';
import '@rmwc/card/styles';
import { CircularProgress } from '@rmwc/circular-progress';
import '@rmwc/circular-progress/styles';
import { Switch } from '@rmwc/switch';
import '@rmwc/switch/styles';
import { Slider } from '@rmwc/slider';
import '@rmwc/slider/styles';

import { CardSuit, CardRank, CardImage, CardHandImage } from '../../games/card.js';
import { gravatarify } from '../../utils/gravatar.js';
import { team_colors } from './team_colors.js';
import { TooltipWrapper } from '../../utils/tooltip.js';

var autosort_persistent = true;

// Properties used for displaying card hands
var handProps = {
  scale: 0.50,
  overlap: true,
  curve: true,
};

class CardHandComponent extends React.Component {
  constructor(props) {
    super(props);

    this.state = {};
    this.state.game = props.game;

    this.state.autosort = false;
    this.state.selected = null;
    this.state.sorting = null;

    let old_handler = this.state.game.interface.onChange;
    this.state.game.interface.onChange = () => {
      old_handler();
      this.setState(state => {
        if (autosort_persistent && state?.autosort) {
          state?.game.interface.data.hand.cardSort(false, false);
        }
        // Jinx
        return state;
      });
    };
  }
  clearSelected() {
    return this.setState(state => Object.assign({}, state, { selected: null }));
  }
  selecting(card) {
    return Object.assign(card, {
      selected: card.id === this.state.selected,
      onClick: () => {
        this.setState(state => {
          state.selected = state.selected === card.id ? null : card.id;
          return state;
        });
      },
    });
  }
  setAutosort(autosort) {
    this.setState(state => {
      state.autosort = autosort;
      if (autosort_persistent && autosort) {
        this.state.game.interface.data.hand.cardSort(false, false);
      }
      return state;
    });
  }
  sort() {
    this.setState(state => {
      if (!state.sorting) {
        state.sorting = [];
      } else {
        state.autosort = false;
        state.game.interface.sort(state.sorting);
        state.sorting = null;
      }
      return state;
    });
  }
  renderHand(selecting) {
    var selected = card => {
      if (!this.state.sorting) {
        if (!selecting) return;
        return card.id === this.state.selected;
      }
      return this.state.sorting.includes(card.id);
    };
    var select = card => {
      this.setState(state => {
        if (!state.sorting) {
          if (!selecting) return state;
          let selected = state.selected === card.id ? null : card.id;
          return Object.assign(state, {selected});
        }
        var i = state.sorting.findIndex(id => id === card.id);
        if (i >= 0) {
          state.sorting.splice(i, 1);
        } else {
          state.sorting.push(card.id);
        }
        return state;
      });
    };
    var badger = card => {
      if (!this.state.sorting) return;
      var i = this.state.sorting.findIndex(id => id === card.id);
      if (i >= 0) return +i+1;
      return null;
    }

    var sideStyle = {
      writingMode: "vertical-rl",
      textOrientation: "mixed",
      textAlign: "end",
      fontWeight: 600,
      height: "calc(100% - 1em)",
      marginRight: "auto",
      paddingBottom: "0.5em",
    };
    var modeStyle = {
      alignSelf: "start",
      fontWeight: 800,
      marginRight: "0.5em",
      fontSize: "1.2em",
    };
    var sortMessage =
      this.state.sorting
      ? this.state.sorting.length
        ? this.state.sorting.length === 1
          ? "Put card here"
          : "Put cards here"
        : "Select cards to put here"
      : "Sort cards here";
    var sortMode = this.state.sorting ? "Sorting" : null;
    var sortOverlay = <>
      { <span style={sideStyle}>{ sortMessage }</span> }
      { <span style={modeStyle}>{ sortMode }</span> }
    </>;

    var cards = this.state.game.interface.data.hand
      .cardSortIf(this.state.autosort)(false,false).cards;

    console.log("CardHandComponent -- render");

    return (
      <CardHandImage {...handProps}>
        { [
          <CardImage key={ "action" } overlay={ sortOverlay }
            scale={handProps.scale} selected={!!this.state.sorting}
            onClick={() => this.sort()}/>
        ].concat(cards.map((card,i) =>
          <CardImage card={ card } key={ card.id }
            scale={handProps.scale}
            selected={ selected(card) }
            badge={ badger(card) }
            onClick={() => select(card)}
            />
        ))}
      </CardHandImage>
    );
  }
}

export {
  CardHandComponent
};
