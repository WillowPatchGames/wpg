import React from 'react';

import '../../../main.scss';

import { Avatar } from '@rmwc/avatar';
import '@rmwc/avatar/styles';
import * as c from '@rmwc/card';
import '@rmwc/card/styles';

import { GameSynopsis, getSuit, sortSynopsisPlayers } from '../synopsis.js';
import { SpadesGame } from '../../../games/spades.js';
import { CardSuit } from '../../../games/card.js';
import { gravatarify } from '../../../utils/gravatar.js';
import { PlayerAvatar } from '../../../utils/player.js';

class SpadesGameSynopsis extends GameSynopsis {
  constructor(props) {
    super(props);

    this.state = this.newState();

    let old_handler = this.props.game.interface.onChange;
    this.props.game.interface.onChange = () => {
      old_handler();
      this.setState(state => this.newState());
    };
  }

  newState() {
    let new_state = { indexed_players: {}, spectators: {}, suit: undefined, broken: this.props.game.interface.data?.spades_broken };
    sortSynopsisPlayers(this.props.game.interface?.synopsis, new_state);
    getSuit(this.props.game.interface?.synopsis, new_state);
    return new_state;
  }

  render() {
    var sigil = (t,c) => <span style={{ fontSize: "170%", color: c }}>{ t }</span>
    var synopsis_columns = {
      "user":{
        name: "User",
        printer: (user,player) =>
          <PlayerAvatar user={ user }
            size={ user.id === this.props.user.id ? "xlarge" : "large" }
            team={ +player.team+1 }
            loading={ player.is_turn }
            />,
      },
      "is_leader":{
        name: "Lead",
        printer: (is_leader,player,state) =>
          !is_leader || !state.suit
          ? ""
          : state.suit instanceof CardSuit
          ? sigil(state.suit.toUnicode() || "♤", state.suit.toColor())
          : state.suit === "waiting"
          ? "…"
          : sigil("♠"),
      },
      "is_dealer":{
        name: "Dealer",
        printer: a => a ? sigil("♠") : "",
      },
      "bid":{
        name: "Bid",
        printer: a => a === 0 ? "–" : a >= 19 ? SpadesGame.bid_names[a] : ""+a,
      },
      "tricks":"Tricks",
      "score":"Score",
      "overtakes":"Overtakes",
    };
    var spectator_columns = {
      "user":{
        name: "User",
        printer: user => <Avatar src={ gravatarify(user) } name={ user.display } size={ user.id === this.props.user.id ? "xlarge" : "large" } />,
      },
    };

    var player_view = this.renderPlayerView(synopsis_columns, spectator_columns);

    return (
      <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
        <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
          <div className="text-left scrollable-x">
            <b>Spades</b> { this.state.broken ? "Spades Broken" : "Spades Not Broken" }
            { player_view }
          </div>
        </c.Card>
      </div>
    );
  }
}

export {
  SpadesGameSynopsis
};
