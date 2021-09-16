import React from 'react';

import '../../../main.scss';

import { Avatar } from '@rmwc/avatar';
import '@rmwc/avatar/styles';
import * as c from '@rmwc/card';
import '@rmwc/card/styles';

import { GameSynopsis, getSuit, sortSynopsisPlayers } from '../synopsis.js';
import { CardSuit } from '../../../games/card.js';
import { gravatarify } from '../../../utils/gravatar.js';
import { PlayerAvatar } from '../../../utils/player.js';

class HeartsGameSynopsis extends GameSynopsis {
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
    let new_state = { indexed_players: {}, spectators: {}, suit: undefined, broken: this.props.game.interface.data?.hearts_broken };
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
            team={+player.team+1}
            loading={player.is_turn}
            />,
      },
      "is_leader":{
        name: "Lead",
        printer: (is_leader,player,state) =>
          !is_leader || !state.suit
          ? ""
          : state.suit instanceof CardSuit
          ? sigil(state.suit.toUnicode() || "♥", state.suit.toColor())
          : state.suit === "waiting"
          ? "…"
          : sigil("♥"),
      },
      "is_dealer":{
        name: "Dealer",
        printer: a => a ? sigil("♥") : "",
      },
      "tricks":"Tricks",
      "round_score":"Round Score",
      "score":"Score",
    };
    var spectator_columns = {
      "user":{
        name: "User",
        printer: user => <Avatar src={ gravatarify(user) } name={ user.display } size={ user.id === this.props.user.id ? "xlarge" : "large" } />,
      },
    };

    var player_view = this.renderPlayerView(synopsis_columns, spectator_columns);

    var pass_direction = "Holding";
    if (this.props.game.interface.synopsis) {
      if (this.props.game.interface.synopsis.pass_direction === 0) {
        pass_direction = "Passing Left";
      } else if (this.props.game.interface.synopsis.pass_direction === 1) {
        pass_direction = "Passing Right";
      } else if (this.props.game.interface.synopsis.pass_direction === 2) {
        pass_direction = "Passing Accross";
      }
    }

    if (this.props.game.lifecycle === "finished") {
      pass_direction = null;
    }

    return (
      <div className="fit-content" style={{ margin: "0 auto 1em auto" }}>
        <c.Card className="fit-content" style={{ padding: "0.5em 0.5em 0.5em 0.5em" }}>
          <div className="scrollable-x">
            <h1 style={{ marginBottom: pass_direction ? 0 : null, color: "#bd2525" }}>Hearts</h1>
            { pass_direction ? <span style={{ fontStyle: "italic" }}>{ pass_direction }</span> : <></> } { this.state.broken ? "Hearts Broken" : "Hearts Not Broken" }
            { player_view }
          </div>
        </c.Card>
      </div>
    );
  }
}

export {
  HeartsGameSynopsis
};
