import React from 'react';

import '../../../main.scss';

import { CardSuit, CardRank, CardImage } from '../../../games/card.js';
import { team_colors } from '../team_colors.js';
import { TooltipWrapper } from '../../../utils/tooltip.js';

import { CardHandComponent } from '../hand.js';

class EightJacksGameBoard extends CardHandComponent {
  constructor(props) {
    super(props);

    this.state.last_remote_selected = null;
    this.state.board_selected = null;
    this.state.marking = null;
    this.state.scale = 0.225;
    this.state.orientation = 0;
    this.state.half_height = false;

    // FIXME: hack?
    let old_handler = this.state.game.interface.onChange;
    this.state.game.interface.onChange = () => {
      old_handler();

      let board_selected = this.state.board_selected;
      let last_remote_selected = this.state.last_remote_selected;
      let selected_square = this.state.game.interface.data.selected_square;
      let not_us = this.state.game.interface.data.selected_square_uid !== this.props.user.id;
      let not_this_client = !not_us && this.state.game.interface.data.selected_square_sid !== this.props.user.getSessionID();

      if (selected_square !== last_remote_selected && (not_us || not_this_client)) {
        board_selected = selected_square;
        last_remote_selected = selected_square;
      }

      this.setState(state => Object.assign({}, state, { board_selected, last_remote_selected }));
    };
  }
  cancelMarksAnd(then) {
    return (...arg) => {
      this.setState(state => Object.assign(state, {
        marking: null,
      }));
      return then && then(...arg);
    };
  }
  clearSelectAnd(then) {
    return (...arg) => {
      this.setState(state => Object.assign(state, {
        selected: null,
        board_selected: this.state.last_remote_selected,
      }));
      return then && then(...arg);
    };
  }
  handleClick(spot) {
    if (this.state.marking) {
      return () => this.setState(state => {
        var i = state.marking.findIndex(o => o === spot.id);
        if (i >= 0) {
          state.marking.splice(i, 1);
        } else {
          state.marking.push(spot.id);
        }
        return state;
      });
    } else {
      if (new CardRank(spot.value.rank).toString() === "joker") return;
      return () => {
        this.setState(state => Object.assign(state, {
          board_selected:state.board_selected===spot.id?null:spot.id
        }));
        this.state.game.interface.controller.select(spot.id);
      }
    }
  }
  drawBoard() {
    var boardProps = {
      scale: this.state.scale || 0.3,
    };
    var game = this.state.game || this.game;
    var board = game.interface.data?.board;
    var by_id = board?.id_mapped;
    if (!by_id) return;
    let selected_card = this.state.selected &&
      game.interface.data.hand.cards.find(
        card => card.id === this.state.selected
      );
    if (selected_card && ["jack","joker"].includes(selected_card.toString())) {
      selected_card = null;
    }
    let runs = {}; let user_team = null;
    for (let player of game.interface.data.players) {
      if (player.runs) {
        for (let run of player.runs) {
          for (let spot_id of run) {
            let t = +player.team+1;
            if (runs[spot_id] && runs[spot_id] !== t) runs[spot_id] = true;
            else runs[spot_id] = t;
          }
        }
      }
      if (+player.user_id === +this.props.user.id) {
        user_team = +player.team+1;
      }
    }
    let displays = {};
    if (game.interface.synopsis.players) {
      for (let player of game.interface.synopsis.players) {
        if (player.player_index !== undefined && player.player_index !== -1) {
          displays[player.player_index] = player.user.display;
        }
      }
    }
    let view_order = []; let last_row = [];
    let transpose = false;
    if (this.state.orientation === 2) {
      transpose = -0;
      for (let i=board.width-1; i>=0; i-=1) {
        view_order.push([]);
        for (let j=board.height-1; j>=0; j-=1) {
          let id = 1 + i*board.height + j;
          view_order[view_order.length-1].push(id);
          if (i === 0) last_row.push(id);
        }
      }
    } else if (this.state.orientation === 1) {
      transpose = -1;
      for (let j=board.height-1; j>=0; j-=1) {
        view_order.push([]);
        for (let i=0; i<=board.width-1; i+=1) {
          let id = 1 + i*board.height + j;
          view_order[view_order.length-1].push(id);
          if (i === board.width-1) last_row.push(id);
        }
      }
    } else if (this.state.orientation === 3) {
      transpose = 1;
      for (let j=0; j<=board.height-1; j+=1) {
        view_order.push([]);
        for (let i=board.width-1; i>=0; i-=1) {
          let id = 1 + i*board.height + j;
          view_order[view_order.length-1].push(id);
          if (i === 0) last_row.push(id);
        }
      }
    } else {
      transpose = 0;
      for (let i=0; i<=board.width-1; i+=1) {
        view_order.push([]);
        for (let j=0; j<=board.height-1; j+=1) {
          let id = 1 + i*board.height + j;
          view_order[view_order.length-1].push(id);
          if (i === board.width-1) last_row.push(id);
        }
      }
    }
    let rows = [];
    for (let ids of view_order) {
      let col = [];
      for (let id of ids) {
        let spot = by_id[id];
        let suit = new CardSuit(spot.value.suit).toImage();
        let rank = new CardRank(spot.value.rank).toImage();
        if (rank === "joker") {
          suit = ""; rank = "logo";
        }
        let mark = spot.marker === -1 ? null : ""+(+spot.marker+1);
        let sel = this.state.marking
          ? this.state.marking.includes(spot.id) && 2
          : this.state.board_selected === spot.id && 1;
        let run = spot.id in runs ? (runs[spot.id] === true ? "*" : ""+(runs[spot.id])) : null;
        let text = mark || <>&nbsp;</>;
        let overlay = <>
          { !mark && !run ? null :
            <span
              className={"marker"}
              style={{
                backgroundColor: mark || run ? team_colors[mark || run] || "lightgray" : null,
                border: run ? "2px solid #333" : null,
                fontWeight: run ? "900" : "600",
              }}>{ text }</span>
          }
        </>;
        let tooltip = (e, handler) => e;
        if (spot.who_marked !== undefined && spot.who_marked !== -1) {
          let name = displays[spot.who_marked];
          if (name) {
            tooltip = (e, handler) => <TooltipWrapper content={ name } align="bottom" clickHandler={ handler }>{e}</TooltipWrapper>;
          }
        }
        col.push(
          <td key={ spot.id } style={{ padding: 0 }}>
            { tooltip(
              <CardImage suit={ suit } rank={ rank } overlay={ overlay } {...boardProps}
                y_part={ this.state.half_height && !last_row.includes(id) ? 0.70 : 0 }
                transpose={ transpose }
                onClick={ this.handleClick(spot) }
                style={{
                  "cursor": "pointer",
                  "--card-fill": sel === 2 ? (team_colors[user_team] || "#82fff3") : sel ? "rgb(251 255 2)" : null,
                  "--card-fill-opacity": sel ? 0.5 : 1,
                }} />,
              () => { this.handleClick(spot) }
            )}
          </td>
        );
      }
      rows.push(<tr key={ rows.length-1 }>{ col }</tr>);
    }
    // overflow-y: hidden prevents unwanted vertical scrolling on iOS
    return <div className="scrollable-x" style={{ maxWidth: "100%" }}>
      <table style={{ margin: "auto", borderSpacing: 0, lineHeight: 0, padding: "4px" }}>
        <tbody>{ rows }</tbody>
      </table>
    </div>;
  }
}

export {
  EightJacksGameBoard
};
