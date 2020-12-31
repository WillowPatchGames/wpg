import React from 'react';
import shallowEqual from 'shallow-eq';
import mergeProps from 'react-merge-props';

import '../../main.scss';

import { gravatarify } from '../../utils/gravatar.js';

import { Avatar } from '@rmwc/avatar';
import '@rmwc/avatar/styles';
import { Button } from '@rmwc/button';
import '@rmwc/card/styles';
import * as c from '@rmwc/card';
import '@rmwc/button/styles';
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
    let old_handler = this.state.game.interface.onChange;
    this.state.game.interface.onChange = () => {
      old_handler();
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
    var status = a => <h3>{ a }</h3>;
    var big_status = a => <h2>{ a }</h2>;
    if (!this.state.game.interface.started) {
      return status("Waiting for game to start …");
    } else if (this.state.game.interface.finished) {
      return <div>
        {status("Finished")}
      </div>;
    } else if (!this.state.game.interface.dealt) {
      if (this.state.game.interface.my_turn()) {
        if (!this.state.game.interface.data.drawn) {
          return <div>
            <div style={{ width: "80%" , margin: "0 auto 0.5em auto" }}>
              <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
                <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                  <Button label="Draw!" unelevated ripple={false} onClick={() => this.state.game.interface.deal()} />
                </div>
              </c.Card>
            </div>
            <div style={{ width: "80%" , margin: "0 auto 0.5em auto" }}>
              <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
                <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                  { this.state.game.interface.data.hand?.toImage() }
                </div>
              </c.Card>
            </div>
          </div>
        } else {
          return <div>
          <div style={{ width: "80%" , margin: "0 auto 0.5em auto" }}>
            <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
              <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                  {status("You got this card:")}
                  { this.state.game.interface.data.drawn?.toImage() }
                  <br />
                  <Button label="Keep" unelevated ripple={false} onClick={() => this.state.game.interface.decide(true)} />
                  <Button label="Take other card" unelevated ripple={false} onClick={() => this.state.game.interface.decide(false)} />
                </div>
              </c.Card>
            </div>
            <div style={{ width: "80%" , margin: "0 auto 0.5em auto" }}>
              <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
                <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                  { this.state.game.interface.data.hand?.toImage() }
                </div>
              </c.Card>
            </div>
          </div>;
        }
      } else {
        return <div>
          <div style={{ width: "80%" , margin: "0 auto 0.5em auto" }}>
            <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
              <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                { status("Waiting for other player to draw …") }
              </div>
            </c.Card>
          </div>
          <div style={{ width: "80%" , margin: "0 auto 0.5em auto" }}>
            <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
              <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                { this.state.game.interface.data.hand?.toImage() }
              </div>
            </c.Card>
          </div>
        </div>;
      }
    } else if (!this.state.game.interface.bidded) {
      if (this.state.game.interface.my_turn()) {
        return <div>
          <div style={{ width: "80%" , margin: "0 auto 0.5em auto" }}>
            <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
              <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                {status("Please place your bid:")}
                <Select label="Bid value" options={ this.state.game.interface.valid_bids() }
                  onChange={ e => {let bid = e.currentTarget.value; this.setState(state => Object.assign(state, {bid}))}
                }/>
                <br />
                <Button label="Place bid" raised ripple={false} onClick={() => this.state.game.interface.bid(this.state.bid)} />
                {
                  !this.state.game.interface.data.peeked
                  ? <Button label="Peek at cards" raised ripple={false} onClick={() => this.state.game.interface.peek()} />
                  : null
                }
              </div>
            </c.Card>
          </div>
          {
            this.state.game.interface.data.peeked
            ? <div style={{ width: "80%" , margin: "0 auto 0.5em auto" }}>
                <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
                  <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                    { this.state.game.interface.data.hand?.toImage() }
                  </div>
                </c.Card>
              </div>
            : null
          }
        </div>;
      } else {
        return <div>
          <div style={{ width: "80%" , margin: "0 auto 0.5em auto" }}>
            <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
              <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                {status("Waiting for bids …")}
              </div>
            </c.Card>
          </div>
          <div style={{ width: "80%" , margin: "0 auto 0.5em auto" }}>
            <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
              <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                { this.state.game.interface.data.hand?.toImage() }
              </div>
            </c.Card>
          </div>
        </div>;
      }
    } else {
      if (this.state.game.interface.my_turn()) {
        return <div>
          <div style={{ width: "80%" , margin: "0 auto 0.5em auto" }}>
            <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
              <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                {status(this.state.game.interface.data.played.cards.length ? "Already played" : "You lead")}
                { this.state.game.interface.data.played?.toImage() }
                {big_status("Your turn to play")}
                {status("Choose a card")}
                <Button label="Play this card" unelevated ripple={false} disabled={ !this.state.selected }
                  onClick={ () => this.state.game.interface.play(this.state.selected) } />
              </div>
            </c.Card>
          </div>
          <div style={{ width: "80%" , margin: "0 auto 0.5em auto" }}>
            <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
              <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                { this.state.game.interface.data.hand?.toImage(this.selecting.bind(this)) }
              </div>
            </c.Card>
          </div>
        </div>;
      } else {
        return <div>
          <div style={{ width: "80%" , margin: "0 auto 0.5em auto" }}>
            <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
              <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                { this.state.game.interface.data.played?.toImage() }
                {status("Waiting for other player to play …")}
              </div>
            </c.Card>
          </div>
          <div style={{ width: "80%" , margin: "0 auto 0.5em auto" }}>
            <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
              <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                { this.state.game.interface.data.hand?.toImage() }
              </div>
            </c.Card>
          </div>
        </div>;
      }
    }
  }
}

export {
  SpadesGameComponent,
}
