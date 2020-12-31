import React from 'react';
import shallowEqual from 'shallow-eq';
import mergeProps from 'react-merge-props';

import '../../main.scss';

import { Button } from '@rmwc/button';
import { Select } from '@rmwc/select';
import '@rmwc/select/styles';
import { CircularProgress } from '@rmwc/circular-progress';
import '@rmwc/circular-progress/styles';

import { CardImage, CardHand } from '../../games/card.js';

class SpadesGameComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.state.game = props.game;
    this.state.selected = null;
    this.state.bid = null;
    // FIXME: hack?
    this.state.game.interface.onChange = () => {
      this.setState(state => {
        // Jinx
        return state;
      });
    };
  }
  selecting(card) {
    return Object.assign(card, {
      selected: card.id === this.state.selected,
      onClick: () => {
        this.setState(state => {
          state.selected = card.id;
          return state;
        });
      },
    });
  }
  render() {
    var status = a => a;
    var player_info = "";//JSON.stringify(this.state.game.players);
    if (!this.state.game.interface.started) {
      return status("Waiting for game to start …");
    } else if (this.state.game.interface.finished) {
      return <div>
        {status("Finished")}
        {player_info}
      </div>;
    } else if (!this.state.game.interface.dealt) {
      if (this.state.game.interface.my_turn()) {
        if (!this.state.game.interface.data.drawn) {
          return <div>
            <Button label="Draw!" unelevated ripple={false} onClick={() => this.state.game.interface.deal()} />
            { this.state.game.interface.data.hand?.toImage() }
          </div>
        } else {
          return <div>
            {status("You got this card:")}
            { this.state.game.interface.data.drawn?.toImage() }
            <Button label="Keep" unelevated ripple={false} onClick={() => this.state.game.interface.decide(true)} />
            <Button label="Take other card" unelevated ripple={false} onClick={() => this.state.game.interface.decide(false)} />
            { this.state.game.interface.data.hand?.toImage() }
          </div>;
        }
      } else {
        return <div>
          { status("Waiting for other player to draw …") }
          { this.state.game.interface.data.hand?.toImage() }
        </div>;
      }
    } else if (!this.state.game.interface.bidded) {
      if (this.state.game.interface.my_turn()) {
        return <div>
          {player_info}
          {status("Please place your bid:")}
          <Select label="Bid value" options={ this.state.game.interface.valid_bids() }
            onChange={ e => {let bid = e.currentTarget.value; this.setState(state => Object.assign(state, {bid}))}
          }/>
          <Button label="Place bid" unelevated ripple={false} onClick={() => this.state.game.interface.bid(this.state.bid)} />
          { this.state.game.interface.data.hand?.toImage() }
        </div>;
      } else {
        return <div>
          {player_info}
          {status("Waiting for bids …")}
          { this.state.game.interface.data.hand?.toImage() }
        </div>;
      }
    } else {
      if (this.state.game.interface.my_turn()) {
        return <div>
          {player_info}
          {status(this.state.game.interface.data.played.cards.length ? "Already played" : "You lead")}
          { this.state.game.interface.data.played?.toImage() }
          {status("Choose a card")}
          { this.state.game.interface.data.hand?.toImage(this.selecting.bind(this)) }
          <Button label="Play this card" unelevated ripple={false} disabled={ !this.state.selected }
            onClick={ () => this.state.game.interface.play(this.state.selected) } />
        </div>;
      } else {
        return <div>
          {player_info}
          { this.state.game.interface.data.played?.toImage() }
          {status("Waiting for other player to play …")}
          { this.state.game.interface.data.hand?.toImage() }
        </div>;
      }
    }
  }
}

export {
  SpadesGameComponent,
}
