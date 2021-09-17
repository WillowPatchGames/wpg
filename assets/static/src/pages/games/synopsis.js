import React from 'react';

import { CardSuit } from '../../games/card.js';

function getSuit(synopsis, new_state) {
  if (synopsis) {
    var suit = synopsis.suit;
    if (suit && CardSuit.fromString(suit) !== null) {
      suit = CardSuit.fromString(suit);
    }
    new_state.suit = suit;
  }
}

class GameSynopsis extends React.Component {
  tabulate = columns => data => {
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

  getHeadings(synopsis_columns) {
    let headings = [];
    for (let k in synopsis_columns) {
      let name = synopsis_columns[k];
      if (typeof name === "object") name = name.name;
      headings.push(<th key={ k }>{ name }</th>);
    }
    return headings;
  }

  getPlayerRows(synopsis_columns) {
    let player_rows = [];

    if (this.state.indexed_players) {
      let remaining = [];

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

      player_rows.push(...this.tabulate(synopsis_columns)(remaining));
    }

    return player_rows
  }

  getSpectatorRows(spectator_columns) {
    var spectator_rows = [];
    if (this.state.spectator_rows) {
      let remaining = [];

      for (let spectator_id of Object.keys(this.state.spectator_rows).sort()) {
        let player = this.state.spectator_rows[spectator_id];
        remaining.push(player);
      }

      spectator_rows.push(...this.tabulate(spectator_columns)(remaining));
    }
  }

  renderPlayerView(synopsis_columns, spectator_columns) {
    let headings = this.getHeadings(synopsis_columns);
    let player_rows = this.getPlayerRows(synopsis_columns);
    let spectator_rows = this.getSpectatorRows(spectator_columns);

    var player_view = null;
    if (player_rows) {
      player_view = <table style={{ "textAlign": "center" }}>
        <tbody>
          <tr key={ "spades_synopsis_headings" }>
            { headings }
          </tr>
          { player_rows }
          { spectator_rows }
        </tbody>
      </table>
    }

    return player_view;
  }
}

function sortSynopsisPlayers(synopsis, new_state) {
  if (synopsis && synopsis.players) {
    for (let player of synopsis.players) {
      if (player.player_index !== -1) {
        new_state.indexed_players[player.player_index] = player;
      } else {
        new_state.spectators[player.player_index] = player;
      }
    }
  }

  return new_state
}

export {
  GameSynopsis,
  getSuit,
  sortSynopsisPlayers,
};
