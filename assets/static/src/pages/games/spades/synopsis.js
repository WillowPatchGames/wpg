import React from 'react';

import '../../../main.scss';

import * as c from '@rmwc/card';
import '@rmwc/card/styles';

import { SpadesGame } from '../../../games/spades.js';
import { CardSuit } from '../../../games/card.js';
import { PlayerAvatar } from '../../../utils/player.js';

class SpadesGameSynopsis extends React.Component {
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
    let new_state = { indexed_players: {}, spectators: {}, suit: undefined, broken: this.props.game.interface.data.spades_broken };

    if (this.props.game.interface.synopsis) {
      if (this.props.game.interface.synopsis.players) {
        for (let player of this.props.game.interface.synopsis.players) {
          if (player.player_index !== -1) {
            new_state.indexed_players[player.player_index] = player;
          } else {
            new_state.spectators[player.player_index] = player;
          }
        }
      }

      var suit = this.props.game.interface.synopsis.suit;
      if (suit && CardSuit.fromString(suit) !== null) {
        suit = CardSuit.fromString(suit);
      }
      new_state.suit = suit;
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

    var player_rows = [];
    if (this.state.indexed_players) {
      var remaining = [];

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

    var player_view = null;
    if (player_rows) {
      player_view = <table style={{ "textAlign": "center" }}>
        <tbody>
          <tr key={ "spades_synopsis_headings" }>
            { headings }
          </tr>
          { player_rows }
        </tbody>
      </table>
    }

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
