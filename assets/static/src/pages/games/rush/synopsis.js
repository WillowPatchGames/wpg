// Library imports
import React from 'react';

import { Avatar, AvatarCount, AvatarGroup } from '@rmwc/avatar';
import '@rmwc/avatar/styles';
import * as c from '@rmwc/card';
import '@rmwc/card/styles';

// Application imports
import { loadGame, addEv } from '../../games.js';
import { UserCache } from '../../../utils/cache.js';
import { gravatarify } from '../../../utils/gravatar.js';

class RushGameSynopsis extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      players: null,
      remaining: null,
    }

    this.game = loadGame(this.props.game);
    this.props.setGame(this.game);

    if (this.game) {
      this.state.interface = this.game.interface;
      this.unmount = addEv(this.game, {
        "synopsis": async (data) => {
          if (data && data.players && data.remaining !== undefined) {
            let players = {};
            for (let player of data.players) {
              var id = +player.user;
              player.user = await UserCache.FromId(id);
              player.user_id = id;

              if (!player.user) {
                player.user = {};
                player.user.display = "unknown";
                if (player.user_id === this.props.user) {
                  player.user.display = "you";
                }
              }

              players[+id] = player;
            }

            this.setState(state => Object.assign({}, state, { players, remaining: data.remaining }));
          }
        },
      });
    }
  }

  componentWillUnmount() {
    if (this.unmount) this.unmount();
  }

  render() {
    var player_view = [];
    if (this.state.remaining !== null) {
      player_view.push(
        <div key="tiles-pool" className="playerSummary">
          <span className="playerSummaryInHand" title="Tiles in Pool">{ this.state.remaining }&nbsp;in&nbsp;pool</span>
        </div>
      );
    }

    if (this.state.players) {
      if (this.state.players[this.props.user.id]) {
        var us = this.state.players[this.props.user.id];
        player_view.push(
          <div key="you-player" className="playerSummary">
            <Avatar src={ gravatarify(us.user) } name="You" size="xlarge" />
            {
              us.playing
              ?
                <span className="playerSummaryInfo">
                  <span className="playerSummaryInHand" title="Tiles in Hand">{ us.in_hand }&nbsp;in&nbsp;hand</span>
                </span>
              :
                <span className="playerSummaryInfo">Spectator</span>
            }
          </div>
        );
      }

      var representative = null;
      var spectators = 0;
      for (let player_id of Object.keys(this.state.players).sort()) {
        if (+player_id === this.props.user.id) {
          continue;
        }

        let them = this.state.players[player_id];
        if (!them.playing) {
          spectators += 1;
          representative = them;
          continue;
        }

        player_view.push(
          <div key={ "player"+player_id } className="playerSummary">
            <Avatar src={ gravatarify(them.user) } name={ them.user.display } size="xlarge" />
            {
              them.playing
              ?
                <span className="playerSummaryInfo">
                  <span className="playerSummaryInHand" title="Tiles in Hand">{ them.in_hand }&nbsp;in&nbsp;hand</span>
                </span>
              :
                <span className="playerSummaryInfo">Spectator</span>
            }
          </div>
        );
      }

      if (spectators === 1) {
        player_view.push(
          <div key="spectator" className="playerSummary">
            <Avatar src={ gravatarify(representative.user) } name={ representative.user.display } size="xlarge" />
            <span className="playerSummaryInfo">Spectator</span>
          </div>
        );
      } else if (spectators > 1) {
        player_view.push(
          <div key="spectators" className="playerSummary">
            <AvatarGroup dense>
              <Avatar src={ gravatarify(representative.user) } name={ representative.user.display } size="xlarge" />
              <AvatarCount size="xlarge" overflow value={ spectators - 1 } />
            </AvatarGroup>
            <span className="playerSummaryInfo">Spectators</span>
          </div>
        );
      }
    }

    return (
      <div style={{ width: "80%" , margin: "0 auto 0.5em auto" }}>
        <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
          <div className="text-left scrollable-x">
            <b>Rush!</b>
            { player_view }
          </div>
        </c.Card>
      </div>
    );
  }
}

export {
  RushGameSynopsis
};
