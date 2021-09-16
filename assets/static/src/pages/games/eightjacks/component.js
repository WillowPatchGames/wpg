import React from 'react';

import '../../../main.scss';

import { Avatar } from '@rmwc/avatar';
import '@rmwc/avatar/styles';
import { Button } from '@rmwc/button';
import '@rmwc/button/styles';
import { IconButton } from '@rmwc/icon-button';
import '@rmwc/icon-button/styles';
import * as c from '@rmwc/card';
import '@rmwc/card/styles';
import { CircularProgress } from '@rmwc/circular-progress';
import '@rmwc/circular-progress/styles';
import { Switch } from '@rmwc/switch';
import '@rmwc/switch/styles';
import { Slider } from '@rmwc/slider';
import '@rmwc/slider/styles';

import { CardSuit, CardRank, CardImage } from '../../../games/card.js';
import { gravatarify } from '../../../utils/gravatar.js';
import { team_colors } from '../team_colors.js';
import { TooltipWrapper } from '../../../utils/tooltip.js';
import { CardHandComponent } from '../hand.js';

class EightJacksGameComponent extends CardHandComponent {
  constructor(props) {
    super(props);
    this.state.game = props.game;
    this.state.last_remote_selected = null;
    this.state.board_selected = null;
    this.state.last_hand = null;
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

      if (selected_square !== last_remote_selected) {
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
  captureHandAnd(then) {
    return (...arg) => {
      this.setState(state => Object.assign(state, {
        last_hand: this.state.game.interface.data.hand?.cards.map(card => card.id),
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
      return () => this.setState(state => Object.assign(state, {
        board_selected:state.board_selected===spot.id?null:spot.id
      }));
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
    var selected_card = this.state.selected &&
      game.interface.data.hand.cards.find(
        card => card.id === this.state.selected
      );
    if (selected_card && ["jack","joker"].includes(selected_card.toString())) {
      selected_card = null;
    }
    var runs = {}; var user_team = null;
    for (let player of game.interface.data.players) {
      if (player.runs) {
        for (let run of player.runs) {
          for (let spot_id of run) {
            var t = +player.team+1;
            if (runs[spot_id] && runs[spot_id] !== t) runs[spot_id] = true;
            else runs[spot_id] = t;
          }
        }
      }
      if (+player.user_id === +this.props.user.id) {
        user_team = +player.team+1;
      }
    }
    var displays = {};
    if (game.interface.synopsis.players) {
      for (let player of game.interface.synopsis.players) {
        if (player.player_index !== undefined && player.player_index !== -1) {
          displays[player.player_index] = player.user.display;
        }
      }
    }
    var view_order = []; var last_row = [];
    var transpose = false;
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
    var rows = [];
    for (let ids of view_order) {
      var col = [];
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
        let tooltip = e => e;
        if (spot.who_marked !== undefined && spot.who_marked !== -1) {
          let name = displays[spot.who_marked];
          if (name) {
            tooltip = e => <TooltipWrapper content={ name } align="bottom">{e}</TooltipWrapper>;
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
                  "--card-fill": sel === 2 ? (team_colors[user_team] || "#82fff3") : sel ? "rgb(251 255 2)" : null,
                  "--card-fill-opacity": sel ? 0.5 : 1,
                }} />
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
  render() {
    var status = a => <h3>{ a }</h3>;
    var big_status = a => <h2>{ a }</h2>;
    let annotations = null;
    if (this.state.game.interface.data.who_marked) {
      annotations = [];
      for (let who_player of this.state.game.interface.data.who_marked) {
        let annotation = <><Avatar src={ gravatarify(who_player) } name={ who_player.display } size="medium" /> <span title={ who_player.display }>{ who_player.display }</span></>;
        annotations.push(annotation);
      }
    }
    var indexed_players = {}; var player_status = null;
    if (this.state.game.interface.synopsis.players) {
      player_status = [];
      for (let player of this.state.game.interface.synopsis.players) {
        if (player.player_index !== -1) {
          indexed_players[player.player_index] = player;
        }
      }
      for (let player_index of Object.keys(indexed_players).sort()) {
        let player = indexed_players[player_index];
        let user = player.user;
        player_status.push(
          <div key={ user.id } className={"avatar-progress avatar-progress--"+(user.id === this.props.user.id ? "xlarge" : "large")} style={{ display: "inline-block" }}>
            <Avatar src={ gravatarify(user) } name={ user.display }
              size={ user.id === this.props.user.id ? "xlarge" : "large" } />
            { !player.is_turn ? null :
              <CircularProgress size={ user.id === this.props.user.id ? "xlarge" : "large" } style={{
                "--stroke-color": team_colors[+player.team+1],
              }} />
            }
          </div>
        );
      }
      player_status = <div className="player-status">{ player_status }</div>;
    }

    if (!this.state.game.interface.started) {
      return status("Waiting for game to start …");
    } else if (this.state.game.interface.finished) {
      return <div>
        {status("Finished")}
      </div>;
    }
    console.log(this.state.game.interface.my_turn());
    return <div>
      <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
        <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
          <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
            <h3>Board</h3>
            <div style={{ display: "flex" }}>
              <IconButton
                checked={this.state.half_height}
                onClick={() => this.setState(state => Object.assign(state, {half_height:!state.half_height}))}
                onIcon="unfold_more"
                icon="unfold_less"
              />
              <Slider
                  value={this.state.scale}
                  onInput={e => {let scale = e.detail.value; this.setState(state => Object.assign(state, {scale}))}}
                  min={0.1}
                  max={0.45}
                />
              <IconButton
                onClick={() => this.setState(state => Object.assign(state, {orientation:(state.orientation + 1) % 4}))}
                icon="rotate_90_degrees_ccw"
              />
            </div>
            { this.drawBoard(true) }
            {this.state.game.interface.my_turn()
              ? <>
                {big_status("Your turn to play")}
                <Button label={ this.state.marking ? "Finish or cancel marking sequence before playing" : (this.state.board_selected ? "Play here" : "Pick a spot!") } unelevated ripple={false} disabled={ !this.state.board_selected || !this.state.selected || this.state.marking || this.state.sorting }
                  onClick={
                    this.clearSelectAnd(
                      () => {
                        this.state.game.interface.play(this.state.selected, this.state.board_selected);
                        this.setState(state => Object.assign({}, state, { board_selected: null, last_remote_selected: null }));
                      }
                    )
                  }
                  />
                <hr/>
                </>
              : <>
                {
                  this.state.game.interface.data?.turn
                  ? status("Waiting for " + this.state.game.interface.data.turn.display  + "…")
                  : status("Waiting for other player(s) …")
                }
                </>
            }
            {this.state.marking ?
              (this.state.marking.length === this.state.game.interface.data.config.run_length
              ? <Button label={ "Mark complete sequence" } raised ripple={false}
                  onClick={this.cancelMarksAnd(() => this.state.game.interface.mark(this.state.marking))} />
              : <Button label={ "Cancel marking" } unelevated ripple={false}
                  onClick={this.cancelMarksAnd()} />)
            : <Button label={ "Mark sequence of " + this.state.game.interface.data.config.run_length } unelevated ripple={false}
                onClick={() => {this.setState(state => Object.assign(state, {marking:[]}))}} />
            }
          </div>
        </c.Card>
      </div>
      <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
        <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
          <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
            <h3>Hand</h3>
            { this.renderHand(true) }
            <br/>
            <Button label={ "Discard dead card" } unelevated ripple={false} disabled={ !this.state.selected || this.state.sorting }
              onClick={this.clearSelectAnd(() => this.state.game.interface.discard(this.state.selected))}/>
            <br/><br/>
            <Switch label={ "Autosort" } checked={this.state.autosort}
              onChange={e => this.setAutosort(e.currentTarget.checked)}/>
            <br/><br/><br/>
            <Switch label={ "Show cards individually" } checked={!this.state.overlap}
              onChange={e => {let overlap=!e.currentTarget.checked;this.setState(state => Object.assign(state, {overlap}))}}/>
          </div>
        </c.Card>
      </div>
      <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
        <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
          <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
            <h3>Rules</h3>
            <div style={{ display: "grid", width: "fit-content", margin: "auto" }}>
              <div style={{ gridColumn: 1, gridRow: 1, textAlign: "right" }}>Play these jacks anywhere,</div>
              <label style={{ gridColumn: 1, gridRow: 2, marginLeft: "auto" }} className="rotate-card">
                <input type="checkbox" className="rotate-card-checkbox"/>
                <div className="rotate-card-inner" style={{ display: "flex", flexDirection: "column" }}>
                  <CardImage suit="diamond" rank="jack" y_part={0.5} scale={0.4}/>
                  <CardImage suit="club" rank="jack" y_part={-0.5} scale={0.4}/>
                </div>
              </label>
              <label style={{ gridColumn: 2, gridRow: 2, margin: "auto" }} className="flip-card">
                <input type="checkbox" className="flip-card-checkbox"/>
                <div className="flip-card-inner">
                  <CardImage suit="black" rank="joker" scale={0.4}/>
                  <CardImage suit="red" rank="joker" scale={0.4}/>
                </div>
              </label>
              <div style={{ gridColumn: 3, gridRow: 1, textAlign: "left" }}>remove markers with these …</div>
              <div style={{ gridColumn: 2, gridRow: 3, textAlign: "center" }}>… and do either with jokers!</div>
              <label style={{ gridColumn: 3, gridRow: 2, marginRight: "auto" }} className="rotate-card">
                <input type="checkbox" className="rotate-card-checkbox"/>
                <div className="rotate-card-inner" style={{ display: "flex", flexDirection: "column" }}>
                  <CardImage suit="heart" rank="jack" y_part={0.5} scale={0.4}/>
                  <CardImage suit="spade" rank="jack" y_part={-0.5} scale={0.4}/>
                </div>
              </label>
            </div>
          </div>
        </c.Card>
      </div>
    </div>;
  }
}

export {
  EightJacksGameComponent,
}
