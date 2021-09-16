import React from 'react';

import '../../../main.scss';

import * as c from '@rmwc/card';
import '@rmwc/card/styles';

import { CardHand } from '../../../games/card.js';
import { PlayerAvatar } from '../../../utils/player.js';

class EightJacksGameSynopsis extends React.Component {
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
    let new_state = { indexed_players: {}, spectators: {}, suit: undefined, global_history: null, player_history: null };

    if (this.props.game.interface.synopsis && this.props.game.interface.synopsis.players) {
      for (let player of this.props.game.interface.synopsis.players) {
        if (player.player_index !== -1) {
          new_state.indexed_players[player.player_index] = player;
        } else {
          new_state.spectators[player.player_index] = player;
        }
      }
    }
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
