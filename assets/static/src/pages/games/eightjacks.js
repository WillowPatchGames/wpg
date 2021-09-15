import React from 'react';

import '../../main.scss';

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
import * as l from '@rmwc/list';
import '@rmwc/list/styles';
import * as g from '@rmwc/grid';
import '@rmwc/grid/styles';
import { Select } from '@rmwc/select';
import '@rmwc/select/styles';
import { Switch } from '@rmwc/switch';
import '@rmwc/switch/styles';
import { Slider } from '@rmwc/slider';
import '@rmwc/slider/styles';

import { CardSuit, CardRank, CardImage, CardHand, CardHandImage } from '../../games/card.js';
import { loadGame, addEv, notify, killable, CreateGameForm } from '../games.js';
import { UserCache, GameCache } from '../../utils/cache.js';
import { gravatarify } from '../../utils/gravatar.js';
import { team_colors } from './team_colors.js';
import { PlayerAvatar } from '../../utils/player.js';
import { TooltipWrapper } from '../../utils/tooltip.js';

var autosort_persistent = true;

// Properties used for displaying card hands
var handProps = {
  scale: 0.50,
  overlap: true,
  curve: true,
};

class EightJacksGameComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.state.game = props.game;
    this.state.last_remote_selected = null;
    this.state.board_selected = null;
    this.state.selected = null;
    this.state.last_hand = null;
    this.state.marking = null;
    this.state.scale = 0.225;
    this.state.overlap = true;
    this.state.autosort = false;
    this.state.sorting = null;
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
  setAutosort(autosort) {
    this.setState(state => {
      state.autosort = autosort;
      if (autosort_persistent && autosort) {
        this.state.game.interface.data.hand.cardSort(true, false);
      }
      return state;
    });
  }
  sort() {
    this.setState(state => {
      if (!state.sorting) {
        state.sorting = [];
      } else {
        state.autosort = false;
        state.game.interface.sort(state.sorting);
        state.sorting = null;
      }
      return state;
    });
  }
  renderHand(selecting) {
    var selected = card => {
      if (!this.state.sorting) {
        if (!selecting) return;
        return card.id === this.state.selected;
      }
      return this.state.sorting.includes(card.id);
    };
    var select = card => {
      this.setState(state => {
        if (!state.sorting) {
          if (!selecting) return state;
          if (state.selected === card.id)
            state.selected = null;
          else
            state.selected = card.id;
          return state;
        }
        var i = state.sorting.findIndex(id => id === card.id);
        if (i >= 0) {
          state.sorting.splice(i, 1);
        } else {
          state.sorting.push(card.id);
        }
        return state;
      });
    };
    var badger = card => {
      if (!this.state.sorting) return;
      var i = this.state.sorting.findIndex(id => id === card.id);
      if (i >= 0) return +i+1;
      return null;
    }

    var sideStyle = {
      writingMode: "vertical-rl",
      textOrientation: "mixed",
      textAlign: "end",
      fontWeight: 600,
      height: "calc(100% - 1em)",
      marginRight: "auto",
      paddingBottom: "0.5em",
    };
    var modeStyle = {
      alignSelf: "start",
      fontWeight: 800,
      marginRight: "0.5em",
      fontSize: "1.2em",
    };
    var sortMessage =
      this.state.sorting
      ? this.state.sorting.length
        ? this.state.sorting.length === 1
          ? "Put card here"
          : "Put cards here"
        : "Select cards to put here"
      : "Sort cards here";
    var sortMode = this.state.sorting ? "Sorting" : null;
    var sortOverlay = <>
      { <span style={sideStyle}>{ sortMessage }</span> }
      { <span style={modeStyle}>{ sortMode }</span> }
    </>;

    var cards = this.state.game.interface.data.hand
      .cardSortIf(this.state.autosort)(true, false).cards;

    return (
      <CardHandImage {...{...handProps, overlap: this.state.overlap, curve: handProps.curve && this.state.overlap} }>
        { [
          <CardImage key={ "action" } overlay={ sortOverlay }
            scale={handProps.scale} selected={!!this.state.sorting}
            onClick={() => this.sort()}/>
        ].concat(cards.map((card,i) =>
          <CardImage card={ card } key={ card.id }
            scale={handProps.scale}
            selected={ selected(card) }
            badge={ badger(card) }
            onClick={() => select(card)}
            />
        ))}
      </CardHandImage>
    );
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
          var id = 1 + i*board.height + j;
          view_order[view_order.length-1].push(id);
          if (i === 0) last_row.push(id);
        }
      }
    } else if (this.state.orientation === 1) {
      transpose = -1;
      for (let j=board.height-1; j>=0; j-=1) {
        view_order.push([]);
        for (let i=0; i<=board.width-1; i+=1) {
          var id = 1 + i*board.height + j;
          view_order[view_order.length-1].push(id);
          if (i === board.width-1) last_row.push(id);
        }
      }
    } else if (this.state.orientation === 3) {
      transpose = 1;
      for (let j=0; j<=board.height-1; j+=1) {
        view_order.push([]);
        for (let i=board.width-1; i>=0; i-=1) {
          var id = 1 + i*board.height + j;
          view_order[view_order.length-1].push(id);
          if (i === 0) last_row.push(id);
        }
      }
    } else {
      transpose = 0;
      for (let i=0; i<=board.width-1; i+=1) {
        view_order.push([]);
        for (let j=0; j<=board.height-1; j+=1) {
          var id = 1 + i*board.height + j;
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

class EightJacksGamePage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      countdown: null,
    };

    this.game = loadGame(this.props.game);
    this.props.setGame(this.game);

    let personalize = async (usr) => usr === this.props.user.id ? "You" : (await UserCache.FromId(usr)).display;
    if (this.game) {
      this.state.interface = this.game.interface;
      this.unmount = addEv(this.game, {
        "started": data => {
          this.props.setNotification("Starting!");
          setTimeout(() => this.props.setNotification(null, "Starting!"), 2000);
          window.scrollTo(0, 0);
          data.message = "Let the games begin!";
          notify(this.props.snackbar, data.message, data.type);
          this.props.game.lifecycle = "playing";
          this.props.game.spectating = !data.playing;
          let page = this.props.room ? "/room/game/" + this.props.game.id : "/game";
          this.props.setPage(page, true);
        },
        "countdown": data => {
          this.props.setNotification(data.value + "...");
          window.scrollTo(0, 0);
          data.message = "Game starting in " + data.value;
          this.setState(state => Object.assign({}, state, { countdown: data.value }));
          setTimeout(() => this.setState(state => Object.assign({}, state, { countdown: null })), 1000);
          this.state.interface.controller.wsController.send({'message_type': 'countback', 'value': data.value});
        },
        "draw": async (data) => {
          data.message = await personalize(data.drawer) + " drew!";
          notify(this.props.snackbar, data.message, data.type);
        },
        "finished": async (data) => {
          data.message = await Promise.all(data.winners.map(personalize)) + " won!";
          notify(this.props.snackbar, data.message, data.type);
          this.game.winners = data.winners;
          let page = this.props.room ? "/room/game/" + this.props.game.id : "/game";
          this.props.setPage(page, true);
        },
        "error": data => {
          notify(this.props.snackbar, data.error, "error");
        },
        "": data => {
          if (data.message) {
            notify(this.props.snackbar, data.message, data.type);
          }
        },
      });
    }
  }
  componentDidMount() {
    //this.props.setImmersive(true);
  }
  componentWillUnmount() {
    if (this.unmount) this.unmount();
    //this.props.setImmersive(false);
  }
  render() {
    var countdown = null;
    if (this.state.countdown !== null && this.state.countdown !== 0) {
      countdown = <div className="countdown-overlay">
        <div className="countdown-circle">
          { this.state.countdown }
        </div>
      </div>
    }

    var configuration = <div style={{ width: "90%" , margin: "0 auto 0.5em auto" }}>
      <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
        <div className="text-center">
          <h3>Game Configuration</h3>
          <l.List>
            <l.CollapsibleList handle={
                <l.SimpleListItem text={ <b>Configuration</b> } metaIcon="chevron_right" />
              }
            >
              <CreateGameForm {...this.props} editable={ false } />
            </l.CollapsibleList>
          </l.List>
        </div>
      </c.Card>
    </div>;

    return (
      <div>
        { countdown }
        <EightJacksGameSynopsis {...this.props} game={ this.game } />
        <EightJacksGameComponent {...this.props} game={ this.game } interface={ this.state.interface } notify={ (...arg) => notify(this.props.snackbar, ...arg) } />
        <g.Grid fixedColumnWidth={ true }>
          <g.GridCell align="left" span={3} tablet={8} />
          <g.GridCell align="right" span={6} tablet={8}>
            { configuration }
          </g.GridCell>
        </g.Grid>
      </div>
    );
  }
}


class EightJacksAfterPartyPage extends React.Component {
  constructor(props) {
    super(props);
    this.game = loadGame(this.props.game);
    this.state = {
      player_mapping: null,
      history: null,
      historical_round: "0",
      active: {
        turn: null,
        dealer: null,
      },
      winners: this.game?.winners,
      dealt: false,
      passed: false,
      finished: false,
      message: "Loading results...",
      scale: 0.225,
      timeout: killable(() => { this.refreshData() }, 5000),
      orientation: 0,
      half_height: false,
      board_selected: null,
    };

    GameCache.Invalidate(this.props.game.id);

    let personalize = async (usr) => usr === this.props.user.id ? "You" : (await UserCache.FromId(usr)).display;
    this.unmount = addEv(this.game, {
      "game-state": async (data) => {
        let winners = [];
        if (data.winners) {
          winners = await Promise.all(data.winners.map(UserCache.FromId.bind(UserCache)));
        }
        if (!winners.length) winners = null;
        this.game.winners = winners;

        let active = {
          turn: null,
          dealer: null,
        };
        let board_selected = this.state.board_selected;
        if (!data.finished) {
          active.turn = await UserCache.FromId(data.turn);
          if (active?.turn !== this.state.active?.turn) {
            board_selected = null;
          }
          active.dealer = await UserCache.FromId(data.dealer);
        }

        // Note: this also tells the rendering to update for the
        // interface state updates.
        this.setState(state => Object.assign(state, { winners, active, board_selected }));
        if (data.finished) {
          if (this.state.timeout) {
            this.state.timeout.kill();
          }

          this.setState(state => Object.assign({}, state, { finished: true, timeout: null }));
        }
      },
      "draw": async (data) => {
        data.message = await personalize(data.drawer) + " drew!";
        notify(this.props.snackbar, data.message, data.type);
      },
      "finished": async (data) => {
        data.message = await Promise.all(data.winners.map(personalize)) + " won!";
        notify(this.props.snackbar, data.message, data.type);
        this.game.winners = data.winners;
      },
      "error": (data) => {
        var message = "Unable to load game data.";
        if (data.error) {
          message = data.error;
        }

        notify(this.props.snackbar, message, data.message_type);
        this.setState(state => Object.assign({}, state, { message }));
      },
      "": data => {
        if (data.message) {
          notify(this.props.snackbar, data.message, data.message_type);
        }
      },
    });
  }
  drawBoard = EightJacksGameComponent.prototype.drawBoard;
  handleClick(spot) {
    if (new CardRank(spot.value.rank).toString() === "joker") return;
    return () => {
      this.setState(state => Object.assign(state, {
        board_selected:state.board_selected===spot.id?null:spot.id
      }));
      this.game.interface.controller.select(spot.id);
    }
  }
  componentDidMount() {
    this.state.timeout.exec();
  }
  componentWillUnmount() {
    this.props.setGame(null);

    if (this.state.timeout) {
      this.state.timeout.kill();
    }

    if (this.unmount) this.unmount();
  }
  returnToRoom() {
    if (this.props.game.interface) {
      this.props.game.interface.close();
    }
    this.props.game.interface = null;

    this.props.setGame(null);
    this.props.setPage("room", true);
  }
  async refreshData() {
    await this.game.interface.controller.wsController.sendAndWait({"message_type": "peek"});

    if (this.state.finished) {
      if (this.state.timeout) {
        this.state.timeout.kill();
        this.setState(state => Object.assign({}, state, { timeout: null }));
      }
    }
  }

  render() {
    var historical_data = null;
    var scoreboard_data = null;

    if (this.state.history) {
      let round_index = parseInt(this.state.historical_round);
      let round_data = <b>No data found for round { round_index + 1 }!</b>;
      if (this.state.history.players[round_index]) {
        let round_players = this.state.history.players[round_index];
        let num_players = Object.keys(round_players).length;
        round_data = [<b>Data for round { round_index + 1}</b>];
        let hands_data = [];
        for (let player_index in this.state.history.players[round_index]) {
          let user = this.state.player_mapping[player_index];
          let player = round_players[player_index];
          let hand = player?.hand ? CardHand.deserialize(player.hand).cardSort(true, false) : null;
          hands_data.push(
            <div>
              <l.List>
                <l.CollapsibleList handle={
                    <l.SimpleListItem text={ <b>{user.display + "'s"} Hand</b> } metaIcon="chevron_right" />
                  }
                >
                  <div style={{ paddingTop: '15px', paddingBottom: '15px' }}>
                    { hand ? hand.toImage(handProps) : null }
                  </div>
                </l.CollapsibleList>
              </l.List>
            </div>
          );
        }
        round_data.push(
          <l.CollapsibleList handle={
              <l.SimpleListItem text={ <b>Player Hands</b> } metaIcon="chevron_right" />
            }
          >
            <div style={{ textAlign: 'center' }}>
              { hands_data }
            </div>
          </l.CollapsibleList>
        );

        if (this.state.history.tricks[round_index]) {
          let tricks_data = [];
          for (let trick_index in this.state.history.tricks[round_index]) {
            let trick = this.state.history.tricks[round_index][trick_index];
            let leader = this.state.player_mapping[trick.leader];
            let winner = this.state.player_mapping[trick.winner];
            let leader_line = null;
            let winner_line = null;
            if (leader) {
              leader_line = <><b>Leader</b>: <Avatar src={ gravatarify(leader) } name={ leader.display } size="medium" /> { leader.display }<br /></>
            }
            if (winner) {
              winner_line = <><b>Winner</b>: <Avatar src={ gravatarify(winner) } name={ winner.display } size="medium" /> <b>{ winner.display }</b><br /></>
            }
            let annotations = [];
            if (leader) {
              for (let offset = 0; offset < num_players; offset++) {
                let annotation_player_index = (trick.leader + offset) % num_players;
                let annotation_player = this.state.player_mapping[annotation_player_index];
                let annotation = <><Avatar src={ gravatarify(annotation_player) } name={ annotation_player.display } size="medium" /> <span title={ annotation_player.display }>{ annotation_player.display }</span></>;
                if (annotation_player_index === trick.winner) {
                  annotation = <><Avatar src={ gravatarify(annotation_player) } name={ annotation_player.display } size="medium" /> <b title={ annotation_player.display }>{ annotation_player.display }</b></>;
                }
                annotations.push(annotation);
              }
            }
            let cards = trick?.played ? CardHand.deserialize(trick.played).toImage(null, null, annotations) : null;
            tricks_data.push(
              <l.CollapsibleList handle={
                  <l.SimpleListItem text={ <b>Trick { parseInt(trick_index) + 1 }</b> } metaIcon="chevron_right" />
                }
              >
                <div style={{ textAlign: 'left' }}>
                  { leader_line }
                  { winner_line }
                </div>
                { cards }
              </l.CollapsibleList>
            );
          }

          round_data.push(
            <l.CollapsibleList handle={
                <l.SimpleListItem text={ <b>Tricks</b> } metaIcon="chevron_right" />
              }
            >
              <div style={{ textAlign: 'center' }}>
                <l.List>
                  { tricks_data }
                </l.List>
              </div>
            </l.CollapsibleList>
          );
        }
      }

      historical_data = <div style={{ width: "90%" , margin: "0 auto 0.5em auto" }}>
        <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
          <div className="text-left">
            <h3>Game Analysis</h3>
            <l.List style={{ maxWidth: "15em" }}>
              <l.ListGroup>
                <Select
                  label="Choose a Round" enhanced
                  value={ this.state.historical_round }
                  onChange={ (e) => this.setState(Object.assign({}, this.state, { historical_round: e.target.value })) }
                  options={ Object.keys(this.state.history.players).map(x => ({ label: 'Round ' + (parseInt(x) + 1), value: x })) }
                />
              </l.ListGroup>
            </l.List>
            <l.List>
              { round_data }
            </l.List>
          </div>
        </c.Card>
      </div>;

      var score_players = [];
      var round_scores = [];
      var final_scores = [];
      for (let player_index of Object.keys(this.state.player_mapping).sort()) {
        let score_player = this.state.player_mapping[player_index];
        score_players.push(<td colspan={2} style={{ borderBottom: "1px solid #777", paddingLeft: '25px', paddingRight: '25px' }}><Avatar src={ gravatarify(score_player) } name={ score_player.display } size="medium" /> { score_player.display }</td>);
      }
      for (let round_index in this.state.history.scores) {
        let round_row = [];
        round_row.push(<td style={{ borderTop: "10px solid transparent", borderBottom: "10px solid transparent" }}> { parseInt(round_index) + 1 } </td>);
        for (let player_index of Object.keys(this.state.player_mapping).sort()) {
          let round_score = parseInt(this.state.history.scores[round_index][player_index].round_score);
          let score = parseInt(this.state.history.scores[round_index][player_index].score);
          let overtakes = parseInt(this.state.history.scores[round_index][player_index].overtakes);

          if (parseInt(round_index) === (this.state.history.scores.length - 1)) {
            final_scores.push(<td colspan={2} style={{ whiteSpace: "nowrap", borderTop: "1px solid #000" }}> { score } / { overtakes } </td>);
          }

          let entry = '-';
          let incr = !isNaN(round_score) && round_score < 0 ? ""+round_score : "+"+round_score
          entry = <>
            <td style={{ whiteSpace: "nowrap", textAlign: "right", paddingLeft: "10px" }}>{ score } / { overtakes }&nbsp;</td>
            <td style={{ textAlign: "left", paddingRight: "10px", fontSize: "75%" }}>({ incr })</td>
          </>;

          round_row.push(entry);
        }
        round_scores.push(<tr> { round_row } </tr>);
      }

      scoreboard_data = <div className="fit-content" style={{ margin: "0 auto 0.5em auto", maxWidth: "90%" }}>
        <c.Card className="fit-content" style={{ padding: "0.5em 0.5em 0.5em 0.5em", maxWidth: "100%" }}>
          <div>
            <h3>Score Board</h3>
            <div style={{ overflow: "auto", maxWidth: "100%" }}>
            <table style={{ fontSize: '1.2em', borderCollapse: "collapse", borderSpacing: 0 }}>
              <thead>
                <tr>
                  <td style={{ paddingLeft: '15px', paddingRight: '15px' }}>Round</td>
                  { score_players }
                </tr>
              </thead>
              <tbody>
                { round_scores }
              </tbody>
              <tfoot>
                <tr>
                  <td>Total</td>
                  { final_scores }
                </tr>
              </tfoot>
            </table>
            </div>
          </div>
        </c.Card>
      </div>;
    }

    var configuration = <div style={{ width: "90%" , margin: "0 auto 0.5em auto" }}>
      <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
        <div className="text-center">
          <h3>Game Configuration</h3>
          <l.List>
            <l.CollapsibleList handle={
                <l.SimpleListItem text={ <b>Configuration</b> } metaIcon="chevron_right" />
              }
            >
              <CreateGameForm {...this.props} editable={ false } />
            </l.CollapsibleList>
          </l.List>
        </div>
      </c.Card>
    </div>;

    var winner_info = <h1>Please wait while the game finishes...</h1>;
    if (this.state.finished && this.state.winners) {
      var winner_names = this.state.winners[0].display;
      if (this.state.winners.length === 1) {
        if (+this.state.winners[0].id === +this.props.user.id) {
          winner_names = "You"
        }
      } else {
        let all_names = [];
        for (let winner of this.state.winners) {
          if (+winner.id === +this.props.user.id) {
            all_names.push("You");
          } else {
            all_names.push(winner.display);
          }
        }

        winner_names = "";
        for (let name_index in all_names) {
          let name = all_names[name_index];
          if (+name_index === 0) {
            winner_names = name;
            continue;
          }

          if (+name_index < all_names.length - 1) {
            winner_names += ", " + name;
            continue;
          }

          if (+name_index === 1) {
            winner_names += " and " + name;
          } else {
            winner_names += ", and " + name;
          }
        }
      }

      winner_info = <h1 style={{ color: "#249724" }}>{winner_names} won!</h1>
    } else if (!this.state.finished && this.state.active?.turn) {
      winner_info = <h1>{ this.state.active.turn.display }'s turn!</h1>
    }

    return (
      <div>
        <EightJacksGameSynopsis game={ this.game } {...this.props} />
        <h1 style={{ color: "#000000" }}><span style={{ color: "#bd2525" }}>Eight</span> Jacks</h1>
        <div>
          { winner_info }
          {
            this.props.room ? <><Button onClick={ () => this.returnToRoom() } raised >Return to Room</Button><br /><br /></> : <></>
          }
          { scoreboard_data }
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
              </div>
            </c.Card>
          </div>
          { historical_data }
          <g.Grid fixedColumnWidth={ true }>
            <g.GridCell align="left" span={3} tablet={8} />
            <g.GridCell align="right" span={6} tablet={8}>
              { configuration }
            </g.GridCell>
          </g.Grid>
        </div>
      </div>
    );
  }
}


export {
  EightJacksGamePage,
  EightJacksAfterPartyPage,
}
