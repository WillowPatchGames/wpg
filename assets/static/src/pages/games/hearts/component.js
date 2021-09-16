import React from 'react';

import '../../../main.scss';

import { Avatar } from '@rmwc/avatar';
import '@rmwc/avatar/styles';
import { Button } from '@rmwc/button';
import '@rmwc/button/styles';
import * as c from '@rmwc/card';
import '@rmwc/card/styles';

import { gravatarify } from '../../../utils/gravatar.js';

// Properties used for display card hands
var handProps = {
  overlap: true,
  curve: true,
  scale: 0.50,
};


class HeartsGameComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.state.selected = null;
    this.state.pass_select = new Set();
    this.state.pass = null;
    this.state.pass_suggesting = true;
    this.state.last_hand = null;
    this.state.sort_by_suit = true;
    this.state.sort_ace_high = true;
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
  clearSelectAnd(then) {
    return (...arg) => {
      this.setState(state => Object.assign(state, {
        selected: null,
        pass_select: new Set(),
        pass_suggesting: true,
      }));
      return then && then(...arg);
    };
  }
  selecting(card) {
    return Object.assign(card, {
      selected: this.state.selected === card.id,
      onClick: () => {
        this.setState(state => {
          if (state.selected === card.id)
            state.selected = null;
          else
            state.selected = card.id;
          return state;
        });
      },
    });
  }
  selecting_pass(card) {
    return Object.assign(card, {
      selected: this.state.pass_select.has(card.id),
      onClick: () => {
        this.setState(state => {
          if (state.pass_select.has(card.id))
            state.pass_select.delete(card.id);
          else
            state.pass_select.add(card.id);
          return state;
        });
      },
    });
  }
  captureHandAnd(then) {
    return (...arg) => {
      this.setState(state => Object.assign(state, {
        last_hand: this.state.game.interface.data.hand?.cards.map(card => card.id),
      }));
      return then && then(...arg);
    };
  }
  showing_new(card) {
    if (!this.state.last_hand) return;
    return Object.assign(card, {
      selected: !this.state.last_hand.includes(card.id),
      onClick: () => {
        this.setState(state => {
          state.last_hand = null;
          return state;
        });
      },
    });
  }
  render() {
    var status = a => <h3>{ a }</h3>;
    var big_status = a => <h2>{ a }</h2>;
    let annotations = null;
    if (this.state.game.interface.data.who_played) {
      annotations = [];
      for (let who_player of this.state.game.interface.data.who_played) {
        let annotation = <span key={ who_player.id }><Avatar src={ gravatarify(who_player) } name={ who_player.display } size="medium" /> { who_player.display }</span>;
        annotations.push(annotation);
      }
    }

    if (!this.state.game.interface.started) {
      return status("Waiting for game to start …");
    } else if (this.state.game.interface.finished) {
      return <div>
        {status("Finished")}
      </div>;
    } else if (!this.state.game.interface.dealt) {
      if (this.state.game.interface.my_deal()) {
          return <div>
            <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
              <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
                <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                  <Button label="Deal!" unelevated ripple={false} onClick={() => this.state.game.interface.deal()} />
                </div>
              </c.Card>
            </div>
            <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
              <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
                <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                  <h3>Hand</h3>
                  { this.state.game.interface.data.hand?.toImage(handProps) }
                </div>
              </c.Card>
            </div>
          </div>;
        } else {
          return <div>
            <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
              <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
                <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                  <h3>Waiting for the dealer to begin...</h3>
                </div>
              </c.Card>
            </div>
            <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
              <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
                <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                  <h3>Hand</h3>
                  { this.state.game.interface.data.hand?.toImage(handProps) }
                </div>
              </c.Card>
            </div>
          </div>;
        }
    } else if (!this.state.game.interface.passed) {
      var pass_direction = "nowhere";
      if (this.props.game.interface.synopsis) {
        if (this.props.game.interface.synopsis.pass_direction === 0) {
          pass_direction = "left";
        } else if (this.props.game.interface.synopsis.pass_direction === 1) {
          pass_direction = "right";
        } else if (this.props.game.interface.synopsis.pass_direction === 2) {
          pass_direction = "accross";
        }
      }
      if (!this.state.game.interface.data.have_passed) {
        return <div>
          <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
            <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
              <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                {status("Please select " + this.state.game.config.number_to_pass + " cards to pass " + pass_direction + ":")}
                <Button label="Pass" raised ripple={false} onClick={this.clearSelectAnd(() =>
                  this.state.game.interface.pass(Array.from(this.state.pass_select)))
                }/>
              </div>
            </c.Card>
          </div>
          <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
              <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
                <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                  <h3>Hand</h3>
                  { this.state.game.interface.data.hand?.toImage(this.selecting_pass.bind(this), handProps) }
                </div>
              </c.Card>
            </div>
        </div>;
      } else {
        return <div>
          <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
            <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
              <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                {status("Waiting for others to finish passing...")}
                { this.state.game.interface.data.incoming ? status("Incoming Cards") : null }
                { this.state.game.interface.data.incoming?.toImage(handProps) }
              </div>
            </c.Card>
          </div>
          <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
              <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
                <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                  <h3>Hand</h3>
                  { this.state.game.interface.data.hand?.toImage(this.selecting_pass.bind(this), handProps) }
                </div>
              </c.Card>
            </div>
        </div>;
      }
    } else {
      var already_played = +this.state.game.interface.data.played.cards.length;
      var num_players = +this.state.game.config.num_players;
      if (this.state.game.interface.my_turn()) {
        var leading = !already_played || already_played >= num_players;
        return <div>
          <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
            <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
              <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                { this.state.game.interface.data.incoming ? status("Incoming Cards") : null }
                { this.state.game.interface.data.incoming?.toImage(handProps) }
                { this.state.game.interface.data?.crib?.cards?.length > 0 ? status("Crib (First Trick)") : null }
                { this.state.game.interface.data?.crib?.toImage(handProps) }
                {status(leading ? (already_played ? "You took it, lead the next trick!" : "You lead off!") : already_played === 1 ? "This card was led" : "These cards have been played")}
                { this.state.game.interface.data.played?.toImage(null, null, annotations) }
                {big_status("Your turn to play")}
                {status("Choose a card")}
                <Button label={ this.state.selected ? "Play this card" : "Pick a card!" } unelevated ripple={false} disabled={ !this.state.selected }
                  onClick={this.clearSelectAnd(() => this.state.game.interface.play(this.state.selected)) } />
              </div>
            </c.Card>
          </div>
          <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
            <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
              <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                <h3>Hand</h3>
                { this.state.game.interface.data.hand?.toImage(this.selecting.bind(this), handProps) }
              </div>
            </c.Card>
          </div>
        </div>;
      } else {
        return <div>
          <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
            <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
              <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                { this.state.game.interface.data.incoming ? status("Incoming Cards") : null }
                { this.state.game.interface.data.incoming?.toImage(handProps) }
                { this.state.game.interface.data?.crib?.cards?.length > 0 ? status("Crib (First Trick)") : null }
                { this.state.game.interface.data?.crib?.toImage(handProps) }
                { status(this.state.game.interface.data.played.cards.length === num_players ? "Last Trick" : "Current Trick") }
                { this.state.game.interface.data.played?.toImage(null, null, annotations) }
                {status("Waiting for the other player" + (num_players < 3 ? "" : "s") + " to play …")}
              </div>
            </c.Card>
          </div>
          <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
            <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
              <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                <h3>Hand</h3>
                { this.state.game.interface.data.hand?.toImage(this.selecting.bind(this), handProps) }
              </div>
            </c.Card>
          </div>
        </div>;
      }
    }
  }
}

export {
  HeartsGameComponent
};
