import React from 'react';

import '../../../main.scss';

import { Avatar } from '@rmwc/avatar';
import '@rmwc/avatar/styles';
import * as c from '@rmwc/card';
import '@rmwc/card/styles';

import { PlayerAvatar } from '../../../utils/player.js';
import { gravatarify } from '../../../utils/gravatar.js';

class GinGameSynopsis extends React.Component {
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
      remaining: this.props.game.interface.synopsis.remaining,
      discarded: this.props.game.interface.synopsis.discarded,
    };

    if (this.props.game.interface.synopsis && this.props.game.interface.synopsis.players) {
      for (let player of this.props.game.interface.synopsis.players) {
        if (player.player_index !== -1) {
          new_state.indexed_players[player.player_index] = player;
        } else {
          new_state.spectators[player.user.id] = player;
        }
      }
    }

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

    var tabulate = columns => data => {
      if (!data) return [null];
      var rows = [];
      for (let dat of data) {
        rows.push([]);
        for (let k in columns) {
          var printer = a => a;
          if (typeof columns[k] === "object") printer = columns[k].printer;
          rows[rows.length-1].push(<td key={ k }>{ printer(dat[k],dat,this.state) }</td>)
        }
      }
      return rows.map((row, i) => <tr key={ data[i].user.id }>{row}</tr>);
    };

    var headings = [];
    for (let k in synopsis_columns) {
      var name = synopsis_columns[k];
      if (typeof name === "object") name = name.name;
      headings.push(<th key={ k }>{ name }</th>);
    }

    var remaining = [];

    var player_rows = [];
    if (this.state.indexed_players) {
      remaining = [];

      for (let player_index of Object.keys(this.state.indexed_players).sort()) {
        let player = this.state.indexed_players[player_index];
        if (+this.props.user.id === +player.user.id) {
          if (player.is_turn && !this.props.game.interface.finished) {
            this.props.setNotification("Your Turn!");
          } else {
            this.props.setNotification(null);
          }
        }
        remaining.push(player);
      }

      player_rows.push(...tabulate(synopsis_columns)(remaining));
    }

    var spectator_rows = [];
    if (this.state.spectator_rows) {
      remaining = [];

      for (let spectator_id of Object.keys(this.state.spectator_rows).sort()) {
        let player = this.state.spectator_rows[spectator_id];
        remaining.push(player);
      }

      player_rows.push(...tabulate(spectator_columns)(remaining));
    }

    var player_view = null;
    if (player_rows) {
      player_view = <table style={{ "textAlign": "center" }}>
        <tbody>
          <tr key={ "Gin_synopsis_headings" }>
            { headings }
          </tr>
          { player_rows }
          { spectator_rows }
        </tbody>
      </table>
    }

    return (
      <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
        <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
          <div className="text-left scrollable-x">
            <b>Gin</b> - { this.state.remaining } cards remaining / { this.state.discarded } cards discarded<br />
            { player_view }
          </div>
        </c.Card>
      </div>
    );
  }
}

export {
  GinGameSynopsis
};
