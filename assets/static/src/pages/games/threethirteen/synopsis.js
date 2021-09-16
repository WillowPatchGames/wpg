import React from 'react';

import '../../../main.scss';

import { Avatar } from '@rmwc/avatar';
import '@rmwc/avatar/styles';
import * as c from '@rmwc/card';
import '@rmwc/card/styles';

import { GameSynopsis, sortSynopsisPlayers } from '../synopsis.js';
import { gravatarify } from '../../../utils/gravatar.js';
import { PlayerAvatar } from '../../../utils/player.js';

class ThreeThirteenGameSynopsis extends GameSynopsis {
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
    let new_state = {
      indexed_players: {},
      spectators: {},
      round: this.props.game.interface.data?.round,
      remaining: this.props.game.interface?.synopsis?.remaining,
      discarded: this.props.game.interface?.synopsis?.discarded,
    };
    sortSynopsisPlayers(this.props.game.interface?.synopsis, new_state);

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
            loading={this.props.game.interface.dealt && !this.props.game.interface.laid_down && player.is_turn}
            />,
      },
      "is_dealer":{
        name: "Dealing",
        printer: a => a ? sigil("♠") : "",
      },
      "has_laid_down":{
        name: "Laid Down",
        printer: a => a ? sigil("♠") : "",
      },
      "round_score":{
        name: "Round Score",
        printer: a => a === -1 ? " " : a,
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
          <div className="text-left scrollable-x">
            <b>Three Thirteen</b> - { this.state.round } cards / { this.state.remaining } cards remaining / { this.state.discarded } cards discarded<br />
            { player_view }
          </div>
        </c.Card>
      </div>
    );
  }
}

export {
  ThreeThirteenGameSynopsis
};
