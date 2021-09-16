import React from 'react';

import '../../../main.scss';

import { Avatar } from '@rmwc/avatar';
import '@rmwc/avatar/styles';
import * as c from '@rmwc/card';
import '@rmwc/card/styles';

import { GameSynopsis, sortSynopsisPlayers } from '../synopsis.js';
import { CardHand } from '../../../games/card.js';
import { gravatarify } from '../../../utils/gravatar.js';
import { PlayerAvatar } from '../../../utils/player.js';

class EightJacksGameSynopsis extends GameSynopsis {
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
    let new_state = { indexed_players: {}, spectators: {}, global_history: null, player_history: null };
    sortSynopsisPlayers(this.props.game.interface?.synopsis, new_state);

    if (this.props.game.interface.data && this.props.game.interface.data.global_history) {
      new_state.global_history = this.props.game.interface.data.global_history;
    } else {
      new_state.global_history = new CardHand([]);
    }
    if (this.props.game.interface.data && this.props.game.interface.data.history) {
      new_state.player_history = this.props.game.interface.data.history;
    } else {
      new_state.player_history = new CardHand([]);
    }

    return new_state;
  }

  render() {
    var synopsis_columns = {
      "user":{
        name: "User",
        printer: (user,player) =>
          <PlayerAvatar user={ user }
            size={ user.id === this.props.user.id ? "xlarge" : "large" }
            team={+player.team+1}
            loading={ player.is_turn } />,
      },
      "team":{
        name: "Team",
        printer: a => +a+1,
      },
      "score":"Score",
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
          <div className="text scrollable-x">
            <h1 style={{ marginBottom: 0 }}><span style={{ color: "#bd2525" }}>Eight</span> Jacks</h1>
            <span style={{ whiteSpace: "normal" }}>Jack of Clubs and Diamonds play anywhere; Jack of Hearts and Spades remove; Jokers do both.</span>
            <div style={{ display: "flex", width: "100%" }}>
              <div style={{ flex: 0 }}>{ player_view }</div>
              <div style={{ flex: 1, maxWidth: "100%", overflow: "auto" }}>
                <b>Player discards</b>
                <div style={{ overflow: "hidden", position: "relative", whiteSpace: "nowrap" }}>
                  { this.state.global_history.toImage(card => {
                    card.selected = this.state.player_history.cards.some(c => c.id === card.id) && 0.3;
                    return card;
                  }, { scale: 0.25, overlap: true, curve: false, style: { float: "right" } })
                  }
                  <div style={{
                    position: "absolute",
                    left: 0, top: 0,
                    width: "calc(100% - 60px)", height: "100%",
                    background: "linear-gradient(to right, white, white calc(5% + 15px), rgba(255, 255, 255, 0.0))",
                    pointerEvents: "none",
                  }}></div>
                </div>
              </div>
            </div>
          </div>
        </c.Card>
      </div>
    );
  }
}

export {
  EightJacksGameSynopsis
};
