// Library imports
import React from 'react';

import {
  Link,
} from "react-router-dom";

import '@rmwc/avatar/styles';
import '@rmwc/button/styles';
import '@rmwc/card/styles';
import '@rmwc/checkbox/styles';
import '@rmwc/dialog/styles';
import '@rmwc/grid/styles';
import '@rmwc/icon/styles';
import '@rmwc/list/styles';
import '@rmwc/select/styles';
import '@rmwc/switch/styles';
import '@rmwc/typography/styles';
import '@rmwc/textfield/styles';

import { Avatar, AvatarCount, AvatarGroup } from '@rmwc/avatar';
import { Button } from '@rmwc/button';
import { Checkbox } from '@rmwc/checkbox';
import * as c from '@rmwc/card';
import * as d from '@rmwc/dialog';
import * as g from '@rmwc/grid';
import { Icon } from '@rmwc/icon';
import * as l from '@rmwc/list';
import { Select } from '@rmwc/select';
import { Switch } from '@rmwc/switch';
import { Typography } from '@rmwc/typography';
import { TextField } from '@rmwc/textfield';

// Application imports
import '../App.css';
import { UserModel, RoomModel, GameModel, normalizeCode } from '../models.js';
import { LoginForm } from './login.js';
import { RushGame, RushData } from '../games/rush.js';
import { RushGamePage, RushAfterPartyPage } from './games/rush.js';
import { SpadesGame } from '../games/spades.js';
import { SpadesGamePage, SpadesAfterPartyPage } from './games/spades.js';
import { ThreeThirteenGame } from '../games/threethirteen.js';
import { ThreeThirteenGamePage, ThreeThirteenAfterPartyPage } from './games/threethirteen.js';
import { HeartsGame } from '../games/hearts.js';
import { HeartsGamePage, HeartsAfterPartyPage } from './games/hearts.js';
import { UserCache, GameCache } from '../utils/cache.js';
import { gravatarify } from '../utils/gravatar.js';

function loadGame(game) {
  if (!game || !game.endpoint) return null;

  if (!game.interface) {
    // XXX: Update to support multiple game types.
    var mode = game.mode || game.style;
    if (mode === "rush") {
      game.interface = new RushGame(game);
    } else if (mode === "spades") {
      game.interface = new SpadesGame(game);
    } else if (mode === "three thirteen") {
      game.interface = new ThreeThirteenGame(game);
    } else if (mode === "hearts") {
      game.interface = new HeartsGame(game);
    } else {
      console.log("Unknown game mode:", mode);
    }
  }

  return game;
}

function addEv(game, events) {
  let unmounts = [];
  for (let message_type in events) {
    var handler = events[message_type];
    let unmount = game.interface.controller.onMessage(message_type, handler);
    unmounts.push(unmount);
  }

  return () => {
    for (let unmount of unmounts) {
      if (unmount !== undefined && unmount !== null) {
        unmount();
      }
    }
  };
}

function notify(snackbar, message, type) {
  if (typeof snackbar === 'function') {
    return snackbar(message, type);
  }
  snackbar.clearAll();
  snackbar.notify({
    body: message,
    dismissesOnAction: true,
    timeout: 3000,
    actions: [{ title: type === "error" ? "Aw shucks" : "Cool" }],
  });
}

function killable(func, interval) {
  var killer = {};
  killer.func = func;
  killer.interval = interval;
  killer.kill = () => { clearTimeout(killer.timeout) };
  killer.exec = () => { killer.kill() ; killer.func() ; killer.restart() };
  killer.restart = () => { killer.timeout = setTimeout(() => { killer.exec() }, killer.interval) };
  return killer;
}

class GamePage extends React.Component {
  constructor(props) {
    super(props);
    console.log(this.props.game);
  }
  render() {
    var mode = this.props.game.mode || this.props.game.style;
    if (mode === 'rush') {
      return <RushGamePage {...this.props}/>
    } else if (mode === 'spades') {
      return <SpadesGamePage {...this.props}/>
    } else if (mode === 'three thirteen') {
      return <ThreeThirteenGamePage {...this.props}/>
    } else if (mode === 'hearts') {
      return <HeartsGamePage {...this.props}/>
    } else {
      return "Unrecognized game mode: " + mode;
    }
  }
}

class PreGamePage extends React.Component {
  constructor(props) {
    super(props);
    this.state = null;
    this.admin = this.props.user && (this.props.user?.id === this.props.game?.owner);
    this.game = loadGame(this.props.game);
    this.props.setGame(this.game);
  }
  render() {
    return this.admin ? <PreGameAdminPage {...this.props} /> : <PreGameUserPage {...this.props} />
  }
}

class AfterPartyPage extends React.Component {
  constructor(props) {
    super(props);
    console.log(this.props.game);
  }
  render() {
    var mode = this.props.game.mode || this.props.game.style;
    if (mode === 'rush') {
      return <RushAfterPartyPage {...this.props}/>
    } else if (mode === 'spades') {
      return <SpadesAfterPartyPage {...this.props}/>
    } else if (mode === 'three thirteen') {
      return <ThreeThirteenAfterPartyPage {...this.props}/>
    } else if (mode === 'hearts') {
      return <HeartsAfterPartyPage {...this.props}/>
    } else {
      return "Unrecognized game mode: " + mode;
    }
  }
}

class PreGameUserPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      status: "pending",
      players: null,
      countdown: null,
    }

    this.game = this.props.game || {};
    this.props.setGame(loadGame(this.game));

    let personalize = async (usr) => usr === this.props.user.id ? "You" : (await UserCache.FromId(usr)).display;
    this.unmount = addEv(this.game, {
      "admitted": async (data) => {
        await this.game.update();
        if (data.admitted) {
          this.setState(state => Object.assign({}, this.state, { status: "waiting" }));
        } else {
          this.setState(state => Object.assign({}, this.state, { status: "pending", players: null }));
        }
      },
      "started": data => {
        data.message = "Let the games begin!";
        notify(this.props.snackbar, data.message, data.type);
        if (data.playing) {
          this.props.setPage('playing', true);
        } else {
          this.props.setPage('afterparty', true);
        }
      },
      "countdown": data => {
        data.message = "Game starting in " + data.value;
        this.setState(state => Object.assign({}, state, { countdown: data.value }));
        setTimeout(() => this.setState(state => Object.assign({}, state, { countdown: null })), 1000);
        this.game.interface.controller.wsController.send({'message_type': 'countback', 'value': data.value});
      },
      "notify-users": async (data) => {
        if (data && data.players) {
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

          this.setState(state => Object.assign({}, state, { players }));
        }
      },
      "finished": async (data) => {
        data.message = await personalize(data.winner) + " won!";
        notify(this.props.snackbar, data.message, data.type);
        this.game.winner = data.winner;
        this.props.setPage('afterparty');
      },
      "": data => {
        if (data.message) {
          notify(this.props.snackbar, data.message, data.type);
        }
      },
    });
  }
  componentWillUnmount() {
    if (this.unmount) this.unmount();
  }
  render() {
    let message = "Game is in an unknown state.";
    if (this.state.status === "pending") {
      message = "Please wait to be admitted to the game.";
    } else if (this.state.status === "waiting") {
      message = "Waiting for the game to start...";
    }

    let users = [];
    if (this.state.players !== null) {
      var i = 0;
      for (let player_id of Object.keys(this.state.players).sort()) {
        let player = this.state.players[player_id];
        var display = +player_id === +this.props.user.id ? "You" : player.user.display;
        users.push(
          <l.ListItem key={display} disabled>
            <span className="unselectable">{+i + 1}.&nbsp;</span> {display}
            <l.ListItemMeta>
              <span className="leftpad"><Switch checked={ player.playing } label={ player.playing ? "Player" : "Spectator" } disabled /></span>
            </l.ListItemMeta>
          </l.ListItem>
        );
        i += 1;
      }
    }

    let content = <c.Card>
      <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
        <b>
          { message }
        </b>

        {
          this.state.status !== "pending"
          ? <l.List>
              <l.CollapsibleList handle={
                  <l.SimpleListItem text={ <b>Configuration</b> } metaIcon="chevron_right" />
                }
              >
                <CreateGameForm {...this.props} editable={ false } />
              </l.CollapsibleList>
              <l.ListGroup>
                <l.ListItem disabled>
                  <b>Users</b>
                </l.ListItem>
                { users }
              </l.ListGroup>
            </l.List>
          : null
        }
      </div>
    </c.Card>;

    var countdown = null;
    if (this.state.countdown !== null && this.state.countdown !== 0) {
      countdown = <div className="countdown-overlay">
        <div className="countdown-circle">
          { this.state.countdown }
        </div>
      </div>
    }

    if (this.props.room === null) {
      return (
        <div>
          { countdown }
          <h1>Game #{ this.props.game.id }</h1>
          <g.Grid fixedColumnWidth={ true }>
            <g.GridCell align="left" span={3} tablet={8} />
            <g.GridCell align="right" span={6} tablet={8}>
              { content }
            </g.GridCell>
          </g.Grid>
        </div>
      );
    }

    return (
      <div>
        { countdown }
        <h1>Game #{ this.props.game.id }</h1>
        { content }
      </div>
    );
  }
}

class PreGameAdminPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      waitlist: [Object.assign({}, this.props.user, { admitted: true, playing: false, connected: false })],
      started: false,
      countdown: null,
    };

    this.game = this.props.game || {};
    this.props.setGame(loadGame(this.game));

    let personalize = async (usr) => usr === this.props.user.id ? "You" : (await UserCache.FromId(usr)).display;
    let userNotification = data => {
      var this_id = data.joined;
      if (this_id === undefined) {
        this_id = data.user;
      }

      var userPromise = UserCache.FromId(this_id);
      userPromise.then((user) => {
        var missing = true;
        for (let player of this.state.waitlist) {
          if (player.id === this_id) {
            Object.assign(player, user);
            if (data.admitted !== undefined && data.admitted !== null) {
              Object.assign(player, { admitted: data.admitted });
            }
            if (data.playing !== undefined && data.playing !== null) {
              Object.assign(player, { playing: data.playing });
            }
            if (data.connected !== undefined && data.connected !== null) {
              Object.assign(player, { connected: data.connected });
            }
            missing = false;
          }
        }

        if (missing) {
          var admitted = data.admitted ? true : false;
          var playing = data.playing ? true : false;
          var connected = data.connected ? true : false;
          this.state.waitlist.push(Object.assign(user, { admitted, playing, connected }));
        }

        this.setState(state => state);
      });
    }

    this.unmount = addEv(this.game, {
      "notify-join": data => userNotification(data),
      "notify-countback": data => userNotification(data),
      "notify-users": data => {
        for (let player of data.players) {
          userNotification(player)
        }
      },
      "started": data => {
        data.message = "Let the games begin!";
        notify(this.props.snackbar, data.message, data.type);
        if (data.playing) {
          this.props.setPage('playing', true);
        } else {
          this.props.setPage('afterparty', true);
        }
      },
      "countdown": data => {
        data.message = "Game starting in " + data.value;
        this.setState(state => Object.assign({}, state, { countdown: data.value }));
        setTimeout(() => this.setState(state => Object.assign({}, state, { countdown: null })), 1000);
        this.game.interface.controller.wsController.send({'message_type': 'countback', 'value': data.value});
      },
      "finished": async (data) => {
        data.message = await personalize(data.winner) + " won!";
        notify(this.props.snackbar, data.message, data.type);
        this.game.winner = data.winner;
        this.props.setPage('afterparty');
      },
      "": data => {
        if (data.message) {
          notify(this.props.snackbar, data.message, data.type);
        }
      },
    });

    this.code_ref = React.createRef();
    this.link_ref = React.createRef();
  }
  componentWillUnmount() {
    if (this.unmount) this.unmount();
  }
  toggleAdmitted(user) {
    for (let u in this.state.waitlist) {
      if (this.state.waitlist[u] === user) {
        if (user.id !== this.props.user.id) {
          user.admitted = !user.admitted;
        }

        if (!user.admitted) {
          this.playing = false;
        }

        this.setState(state => state);
        this.game.interface.controller.admitPlayer(user.id, user.admitted, user.playing);
      }
    }
  }
  toggleSpectator(user) {
    for (let u in this.state.waitlist) {
      if (this.state.waitlist[u] === user) {
        user.playing = !user.playing;
        if (!user.admitted) {
          this.playing = false;
        }

        this.setState(state => state);
        this.game.interface.controller.admitPlayer(user.id, user.admitted, user.playing);
      }
    }
  }
  async start() {
    this.setState(state => Object.assign({}, state, { started: true }));

    var ret = await this.game.interface.controller.startGame();
    if (ret && ret.message_type && ret.message_type === "error") {
      notify(this.props.snackbar, ret.error, "error");
      this.setState(state => Object.assign({}, state, { started: false }));
      return;
    }

    this.props.setPage('playing', true);
  }
  render() {
    let invite = null;
    if (this.props.room === null) {
      invite =
      <l.ListGroup>
        <l.ListItem disabled>
          <b>Join</b>
        </l.ListItem>
        <l.ListItem disabled>
          <p>Share this code to let users join:</p>
        </l.ListItem>
        <l.ListItem onClick={() => { this.code_ref.current.select() ; document.execCommand("copy"); this.props.snackbar.notify({title: <b>Game invite code copied!</b>, timeout: 3000, dismissesOnAction: true, icon: "info"}); } }>
          <l.ListItemText className="App-game-code">
            <TextField fullwidth readOnly value={ this.game.code } inputRef={ this.code_ref } />
          </l.ListItemText>
          <l.ListItemMeta icon="content_copy" />
        </l.ListItem>
        <l.ListItem disabled>
          <p>Or have them visit this link:</p>
        </l.ListItem>
        <l.ListItem onClick={ () => { var range = document.createRange(); range.selectNode(this.link_ref.current); window.getSelection().removeAllRanges();  window.getSelection().addRange(range); document.execCommand("copy"); this.props.snackbar.notify({title: <b>Game invite link copied!</b>, timeout: 3000, dismissesOnAction: true, icon: "info"}); }}>
          <p><Link ref={ this.link_ref } to={ "/play?code=" + this.game.code } onClick={ (e) => { e.preventDefault(); } }>{ window.location.origin + "/play?code=" + this.game.code }</Link></p>
        </l.ListItem>
      </l.ListGroup>;
    }

    let content = <c.Card>
      <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
        <l.List twoLine>
          { invite }
          <l.CollapsibleList handle={
              <l.SimpleListItem text={ <b>Configuration</b> } metaIcon="chevron_right" />
            }
          >
            <CreateGameForm {...this.props} editable={ false } />
          </l.CollapsibleList>
          <l.ListGroup>
            <l.ListItem disabled>
              <b>Users</b>
            </l.ListItem>
            { this.state.waitlist.map((user, i) =>
                <l.ListItem key={user.display} disabled>
                  <span className="unselectable">{+i + 1}.&nbsp;</span> {user.display}
                  <l.ListItemMeta>
                    <Checkbox checked={user.admitted} label="Admitted" onChange={ () => this.toggleAdmitted(user) } />
                    {
                      user.admitted ?
                        <span className="leftpad"><Switch checked={ user.playing } label={ user.playing ? "Player" : "Spectator" } onChange={ () => this.toggleSpectator(user) } /></span>
                        :
                        <></>
                    }
                    {
                      this.state.started
                      ? <Icon icon={ user.connected ? 'check' : 'hourglass_empty' } style={{ 'verticalAlign': 'middle' }} />
                      : null
                    }
                  </l.ListItemMeta>
                </l.ListItem>
            )}
          </l.ListGroup>
        </l.List>
        <Button onClick={ () => this.start() } label={ this.state.started ? "Restart" : "Start" } raised />
      </div>
    </c.Card>;

    var countdown = null;
    if (this.state.countdown !== null && this.state.countdown !== 0) {
      countdown = <div className="countdown-overlay">
        <div className="countdown-circle">
          { this.state.countdown }
        </div>
      </div>
    }

    if (this.props.room === null) {
      return (
        <div>
          { countdown }
          <h1>Game #{ this.props.game.id }</h1>
          <g.Grid fixedColumnWidth={ true }>
            <g.GridCell align="left" span={3} tablet={8} />
            <g.GridCell align="right" span={6} tablet={8}>
              { content }
            </g.GridCell>
          </g.Grid>
        </div>
      );
    }

    return (
      <div>
        { countdown }
        <h1>Game #{ this.props.game.id }</h1>
        { content }
      </div>
    );
  }
}

class CreateGameForm extends React.Component {
  constructor(props) {
    super(props);

    var have_game = this.props.game !== undefined && this.props.game !== null && this.props.game.config !== undefined && this.props.game.config !== null;
    var game = have_game ? this.props.game : undefined;
    var editable = this.props.editable === undefined || this.props.editable;

    this.state = {
      editable: editable,
      error: null,
      mode: have_game ? game.style : null,
      open: have_game ? game.open : true,
      spectators: have_game && game.spectator !== undefined ? game.spectator : true,
      initialized: false,
    }

    Object.assign(this.state, this.createGameConfig());
  }

  createGameConfig(new_style) {
    var have_game = this.props.game !== undefined && this.props.game !== null && this.props.game.config !== undefined && this.props.game.config !== null;
    var game = have_game ? this.props.game : undefined;
    var config = have_game ? game.config : undefined;
    var have_arg = new_style !== undefined && new_style !== null;
    var have_state = this.state !== undefined && this.state !== null && this.state.mode === null && this.state.mode !== undefined;

    if (!have_game && !have_arg && !have_state) {
      return null;
    }

    var additional_state = {
      initialized: true,
    };
    var style = have_arg
                ? new_style
                : (
                  have_state ? this.state.mode : game.style
                );
    if (style === 'rush') {
      additional_state = {
        initialized: true,
        num_players: have_game ? config.num_players : 4,
        num_tiles: have_game ? config.num_tiles : 75,
        tiles_per_player: have_game ? config.tiles_per_player : false,
        start_size: have_game ? config.start_size : 12,
        draw_size: have_game ? config.draw_size : 1,
        discard_penalty: have_game ? config.discard_penalty : 3,
        frequency: have_game ? config.frequency : 1,
      }
    } else if (style === 'spades') {
      additional_state = {
        initialized: true,
        num_players: have_game ? config.num_players : 4,
        overtakes: have_game ? config.overtakes : true,
        overtake_limit: have_game ? config.overtake_limit : 10,
        must_break_spades: have_game ? config.must_break_spades : true,
        add_jokers: have_game ? config.add_jokers : false,
        first_wins: have_game ? config.first_wins : false,
        with_partners: have_game ? config.with_partners : true,
        full_history: have_game ? config.full_history : false,
        with_nil: have_game ? config.with_nil : true,
        overtakes_nil: have_game ? config.overtakes_nil : true,
        blind_bidding: have_game ? config.blind_bidding : true,
        with_double_nil: have_game ? config.with_double_nil : true,
        with_break_bonus: have_game ? config.with_break_bonus : false,
        with_triple_nil: have_game ? config.with_triple_nil : false,
        win_amount: have_game ? config.win_amount : 500,
        overtake_penalty: have_game ? +config.overtake_penalty : 100,
        trick_multipler: have_game ? config.trick_multipler : 10,
        perfect_round: have_game ? config.perfect_round : false,
        nil_score: have_game ? config.nil_score : 100,
      };
    } else if (style === 'three thirteen') {
      additional_state = {
        initialized: true,
        num_players: have_game ? config.num_players : 4,
        min_draw_size: have_game ? config.min_draw_size : 14,
        add_jokers: have_game ? config.add_jokers : true,
        allow_mostly_wild: have_game ? config.allow_mostly_wild : false,
        allow_all_wild_cards: have_game ? config.allow_all_wild_cards : true,
        same_suit_runs: have_game ? config.same_suit_runs : true,
        laying_down_limit: have_game ? config.laying_down_limit : 0,
        allow_big_gin: have_game ? config.allow_big_gin : false,
        with_fourteenth_round: have_game ? config.with_fourteenth_round : false,
        to_point_limit: have_game ? config.to_point_limit : -1,
        golf_scoring: have_game ? config.golf_scoring : true,
      };
    } else if (style === 'eight jacks') {
      additional_state = {
        initialized: true,
        num_players: have_game ? config.num_players : 4,
        run_length: have_game ? config.run_length : 4,
        win_limit: have_game ? config.win_limit : 3,
        board_width: have_game ? config.board_width : 9,
        board_height: have_game ? config.board_height : 9,
        remove_unused: have_game ? config.remove_unused : true,
        wild_corners: have_game ? config.wild_corners : true,
        hand_size: have_game ? config.hand_size : 5,
        joker_count: have_game ? config.joker_count : 4,
      };
    } else if (style === 'hearts') {
      additional_state = {
        initialized: true,
        num_players: have_game ? config.num_players : 4,
        number_to_pass: have_game ? config.number_to_pass : 3,
        hold_round: have_game ? config.hold_round : true,
        must_break_hearts: have_game ? config.must_break_hearts : true,
        black_widow_breaks: have_game ? config.black_widow_breaks : false,
        first_trick_hearts: have_game ? config.first_trick_hearts : false,
        with_crib: have_game ? config.with_crib : false,
        win_amount: have_game ? config.win_amount : 100,
        shoot_moon_reduces: have_game ? config.shoot_moon_reduces : true,
        shoot_the_sun: have_game ? config.shoot_the_sun : true,
        jack_of_dimaonds: have_game ? config.jack_of_dimaonds : false,
        ten_of_clubs: have_game ? config.ten_of_clubs : false,
        black_widow_for_five: have_game ? config.black_widow_for_five : false,
        ace_of_hearts: have_game ? config.ace_of_hearts : false,
        no_trick_bonus: have_game ? config.no_trick_bonus : false,
        hundred_to_half: have_game ? config.hundred_to_half : false,
      };
    } else {
      console.log("Unknown game style: " + style, game, this.state, this.props);
    }

    if (additional_state !== null) {
      if (this.state.initialized) {
        this.setState(state => Object.assign({}, state, additional_state));
      }
      return additional_state;
    }

    return {};
  }

  toObject() {
    if (this.state.mode === 'rush') {
      return this.rushToObject();
    } else if (this.state.mode === 'spades') {
      return this.spadesToObject();
    } else if (this.state.mode === 'three thirteen') {
      return this.threethirteenToObject();
    } else if (this.state.mode === 'eight jacks') {
      return this.eightjacksToObject();
    } else if (this.state.mode === 'hearts') {
      return this.heartsToObject();
    } else {
      console.log("Unknown game style: " + this.state.mode, this.state);
    }
  }

  rushToObject() {
    return {
      'num_players': +this.state.num_players,
      'num_tiles': +this.state.num_tiles,
      'tiles_per_player': this.state.tiles_per_player,
      'start_size': +this.state.start_size,
      'draw_size': +this.state.draw_size,
      'discard_penalty': +this.state.discard_penalty,
      'frequency': +this.state.frequency,
    };
  }

  spadesToObject() {
    return {
      'num_players': +this.state.num_players,
      'overtakes': this.state.overtakes,
      'overtake_limit': +this.state.overtake_limit,
      'must_break_spades': this.state.must_break_spades,
      'add_jokers': this.state.add_jokers,
      'first_wins': this.state.first_wins,
      'with_partners': this.state.with_partners,
      'full_history': this.state.full_history,
      'with_nil': this.state.with_nil,
      'overtakes_nil': this.state.overtakes_nil,
      'blind_bidding': this.state.blind_bidding,
      'with_double_nil': this.state.with_double_nil,
      'with_break_bonus': this.state.with_break_bonus,
      'with_triple_nil': this.state.with_triple_nil,
      'win_amount': +this.state.win_amount,
      'overtake_penalty': +this.state.overtake_penalty,
      'trick_multipler': +this.state.trick_multipler,
      'perfect_round': this.state.perfect_round,
      'nil_score': +this.state.nil_score,
    };
  }

  threethirteenToObject() {
    return {
      'num_players': +this.state.num_players,
      'min_draw_size': +this.state.min_draw_size,
      'add_jokers': this.state.add_jokers,
      'allow_mostly_wild': this.state.allow_mostly_wild,
      'allow_all_wild_cards': this.state.allow_all_wild_cards,
      'same_suit_runs': this.state.same_suit_runs,
      'laying_down_limit': +this.state.laying_down_limit,
      'allow_big_gin': this.state.allow_big_gin,
      'with_fourteenth_round': this.state.with_fourteenth_round,
      'to_point_limit': +this.state.to_point_limit,
      'golf_scoring': this.state.golf_scoring,
    };
  }

  eightjacksToObject() {
    return {
      'num_players': +this.state.num_players,
      'run_length': +this.state.run_length,
      'win_limit': +this.state.win_limit,
      'board_width': +this.state.board_width,
      'board_height': +this.state.board_height,
      'remove_unused': this.state.remove_unused,
      'wild_corners': this.state.wild_corners,
      'hand_size': +this.state.hand_size,
      'joker_count': +this.state.joker_count,
    };
  }

  heartsToObject() {
    return {
      'num_players': +this.state.num_players,
      'number_to_pass': +this.state.number_to_pass,
      'hold_round': this.state.hold_round,
      'must_break_hearts': this.state.must_break_hearts,
      'black_widow_breaks': this.state.black_widow_breaks,
      'first_trick_hearts': this.state.first_trick_hearts,
      'with_crib': this.state.with_crib,
      'win_amount': +this.state.win_amount,
      'shoot_moon_reduces': this.state.shoot_moon_reduces,
      'shoot_the_sun': this.state.shoot_the_sun,
      'jack_of_dimaonds': this.state.jack_of_dimaonds,
      'ten_of_clubs': this.state.ten_of_clubs,
      'black_widow_for_five': this.state.black_widow_for_five,
      'ace_of_hearts': this.state.ace_of_hearts,
      'no_trick_bonus': this.state.no_trick_bonus,
      'hundred_to_half': this.state.hundred_to_half,
    };
  }

  async handleSubmit(event) {
    event.preventDefault();

    if (!this.state.editable) {
      return;
    }

    if (this.props.user === null || !this.props.user.authed) {
      this.setError("Need to have a user account before doing this action!");
      return;
    }

    var game = new GameModel(this.props.user);
    game.mode = this.state.mode;
    game.open = this.state.open;
    game.spectators = this.state.spectators;
    game.config = this.toObject();

    if (this.props.room !== null) {
      game.room = this.props.room;
    }

    await game.create();

    if (game.error !== null) {
      this.setError(game.error.message);
    } else {
      game = await GameModel.FromId(this.props.user, game.id);
      this.props.setGame(game);

      if (this.props.room === null) {
        this.props.setPage('play', '?code=' + game.code);
      }

      if (this.props.callback !== undefined && this.props.callback !== null) {
        this.props.callback();
      }
    }
  }

  newState(fn, cb) {
    if (!this.state.editable) {
      return;
    }

    return this.setState(state => Object.assign({}, state, fn(state)));
  }

  inputHandler(name, checky) {
    if (name !== "mode") {
      return (e) => {
        var v = checky ? e.target.checked : e.target.value;
        return this.newState(() => ({ [name]: v }));
      };
    }

    return (e) => {
      var v = checky ? e.target.checked : e.target.value;
      return this.newState(() => ({ [name]: v, "config": this.createGameConfig(v) }));
    };
  }

  toggle(name) {
    this.newState(state => ({ [name]: !state[name] }));
  }

  setError(message) {
    this.setState(state => Object.assign({}, state, { error: message }));
  }

  renderRush() {
    var pl = (num, name) => (""+num+" "+name+(+num === 1 ? "" : "s"));

    return (
      <>
        <l.ListGroupSubheader>Rush Options</l.ListGroupSubheader>
        <l.ListItem disabled>
          <TextField fullwidth type="number" label="Number of Players" name="num_players" value={ this.state.num_players } onChange={ this.inputHandler("num_players") } min="2" max="15" step="1" disabled={ !this.state.editable } />
        </l.ListItem>
        <l.ListItem disabled>
          <TextField fullwidth type="number" label="Number of Tiles" name="num_tiles" value={ this.state.num_tiles } onChange={ this.inputHandler("num_tiles") } min="10" max="200" step="1" disabled={ !this.state.editable } />
        </l.ListItem>
        <l.ListItem onClick={(e) => e.target === e.currentTarget && this.toggle("tiles_per_player") } disabled={ !this.state.editable }>
          <Switch label={ this.state.tiles_per_player ? "Tiles per Player" : "Total Number of Tiles" } name="tiles_per_player" checked={ this.state.tiles_per_player } onChange={ () => this.toggle("tiles_per_player", true) } disabled={ !this.state.editable } />
        </l.ListItem>
        {
          this.state.tiles_per_player
          ? <p>There will be { this.state.num_tiles } tiles per player</p>
          : <p>There will be { this.state.num_tiles } tiles overall</p>
        }
        <br />
        <Select label="Tile Frequency" enhanced value={ "" + this.state.frequency } onChange={ this.inputHandler("frequency") }  disabled={ !this.state.editable } options={
          [
            {
              label: 'Standard US English Letter Frequencies',
              value: '1',
            },
            {
              label: 'Bananagrams Tile Frequency',
              value: '2',
            },
            {
              label: 'Scrabble Tile Frequency',
              value: '3',
            }
          ]
        } />
        <br/>
        {
          +this.state.frequency === 1 ?
          <p>This uses the standard frequency breakdown of US English text to create a pool of tiles. Letters such as q and z are really infrequent while vowels are more common.</p>
          : (
            +this.state.frequency === 2 ?
            <p>This uses the frequency breakdown of Bananagrams, scaled to the size of the pool.</p>
            :
            <p>This uses the frequency breakdown of Scrabble, scaled to the size of the pool.</p>
          )
        }
        <br />
        <l.ListItem disabled>
          <TextField fullwidth type="number" label="Player Tile Start Size" name="start_size" value={ this.state.start_size } onChange={ this.inputHandler("start_size") } min="7" max="25" step="1" disabled={ !this.state.editable } />
          <p></p>
        </l.ListItem>
        <l.ListItem disabled>
          <TextField fullwidth type="number" label="Player Tile Draw Size" name="draw_size" value={ this.state.draw_size } onChange={ this.inputHandler("draw_size") } min="1" max="10" step="1" disabled={ !this.state.editable } />
        </l.ListItem>
        <l.ListItem disabled>
          <TextField fullwidth type="number" label="Player Tile Discard Penalty" name="discard_penalty" value={ this.state.discard_penalty } onChange={ this.inputHandler("discard_penalty") } min="1" max="5" step="1" disabled={ !this.state.editable } />
        </l.ListItem>
        <p>Each player will start with { pl(this.state.start_size, "tile") }. Each draw will be { pl(this.state.draw_size, "tile") }, and players who discard a tile will need to draw { this.state.discard_penalty } back.</p>
        <br/>
      </>
    );
  }

  renderSpades() {
    return (
      <>
        <l.ListGroupSubheader>Game Options</l.ListGroupSubheader>
        <l.ListItem disabled>
          <TextField fullwidth type="number" label="Number of Players" name="num_players" value={ this.state.num_players } onChange={ this.inputHandler("num_players") } min="2" max="15" step="1" disabled={ !this.state.editable } />
        </l.ListItem>
        <l.ListGroupSubheader>
          Trick Options
        </l.ListGroupSubheader>
        <l.ListItem onClick={(e) => e.target === e.currentTarget && this.toggle("overtakes") } disabled={ !this.state.editable }>
          <Switch label={ this.state.overtakes ? "Overtakes Counted" : "No Overtakes" } name="overtakes" checked={ this.state.overtakes } onChange={ () => this.toggle("overtakes", true) } disabled={ !this.state.editable } />
        </l.ListItem>
        {
          this.state.overtakes
          ? <l.ListItem disabled>
              <TextField fullwidth type="number" label="Overtake Penalty Limit" name="overtake_limit" value={ this.state.overtake_limit } onChange={ this.inputHandler("overtake_limit") } min="2" max="15" step="1" disabled={ !this.state.editable || !this.state.overtakes } />
            </l.ListItem>
          : null
        }
        <l.ListItem onClick={(e) => e.target === e.currentTarget && this.toggle("must_break_spades") } disabled={ !this.state.editable }>
          <Switch label={ this.state.must_break_spades ? "Must Wait for Spades to be Sluffed Before Leading Spades" : "Can Play Spades at Any Time" } name="must_break_spades" checked={ this.state.must_break_spades } onChange={ () => this.toggle("must_break_spades", true) } disabled={ !this.state.editable } />
        </l.ListItem>
        <l.ListItem onClick={(e) => e.target === e.currentTarget && this.toggle("add_jokers") } disabled={ !this.state.editable }>
          <Switch label={ this.state.add_jokers ? "Add Jokers for Three or Six Players" : "Leave Jokers Out" } name="add_jokers" checked={ this.state.add_jokers } onChange={ () => this.toggle("add_jokers", true) } disabled={ !this.state.editable } />
        </l.ListItem>
        <l.ListItem onClick={(e) => e.target === e.currentTarget && this.toggle("first_wins") } disabled={ !this.state.editable }>
          <Switch label={ this.state.first_wins ? "First Highest Played Card Wins (Six Players Only)" : "Last Highest Played Card Wins (Six Players Only)" } name="first_wins" checked={ this.state.first_wins } onChange={ () => this.toggle("first_wins", true) } disabled={ !this.state.editable } />
        </l.ListItem>
        <l.ListItem onClick={(e) => e.target === e.currentTarget && this.toggle("with_partners") } disabled={ !this.state.editable }>
          <Switch label={ this.state.with_partners ? "Play With Partners (Four and Six Players Only)" : "Play Individually" } name="with_partners" checked={ this.state.with_partners } onChange={ () => this.toggle("with_partners", true) } disabled={ !this.state.editable } />
        </l.ListItem>
        <l.ListItem onClick={(e) => e.target === e.currentTarget && this.toggle("full_history") } disabled={ !this.state.editable }>
          <Switch label={ this.state.full_history ? "Allow Peeking at Previous Tricks" : "Only See Final Card in the Previous Trick" } name="full_history" checked={ this.state.full_history } onChange={ () => this.toggle("full_history", true) } disabled={ !this.state.editable } />
        </l.ListItem>
        <l.ListGroupSubheader>
          Nil Options
        </l.ListGroupSubheader>
        <l.ListItem onClick={(e) => e.target === e.currentTarget && this.toggle("with_nil") } disabled={ !this.state.editable }>
          <Switch label={ this.state.with_nil ? "Allow Nil Builds" : "Forbid Nil and Zero Bids" } name="with_nil" checked={ this.state.with_nil } onChange={ () => this.toggle("with_nil", true) } disabled={ !this.state.editable } />
        </l.ListItem>
        <l.ListItem onClick={(e) => e.target === e.currentTarget && this.toggle("overtakes_nil") } disabled={ !this.state.editable }>
          <Switch label={ this.state.overtakes_nil ? "Score Overtakes with Nil Bids" : "Ignore Overtakes with Nil Bids" } name="overtakes_nil" checked={ this.state.overtakes_nil } onChange={ () => this.toggle("overtakes_nil", true) } disabled={ !this.state.editable } />
        </l.ListItem>
        <l.ListItem onClick={(e) => e.target === e.currentTarget && this.toggle("blind_bidding") } disabled={ !this.state.editable }>
          <Switch label={ this.state.blind_bidding ? "Enable Blind Bidding" : "Always Look at Cards First" } name="blind_bidding" checked={ this.state.blind_bidding } onChange={ () => this.toggle("blind_bidding", true) } disabled={ !this.state.editable } />
        </l.ListItem>
        <l.ListItem onClick={(e) => e.target === e.currentTarget && this.toggle("with_double_nil") } disabled={ !this.state.editable }>
          <Switch label={ this.state.with_double_nil ? "Require Both Partners Make Nil if Both Bid Nil (Double Nil)" : "Score Partners Bidding Nil Separately" } name="with_double_nil" checked={ this.state.with_double_nil } onChange={ () => this.toggle("with_double_nil", true) } disabled={ !this.state.editable } />
        </l.ListItem>
        <l.ListItem onClick={(e) => e.target === e.currentTarget && this.toggle("with_break_bonus") } disabled={ !this.state.editable }>
          <Switch label={ this.state.with_break_bonus ? "Give a Bonus for Breaking Both Partners in Double Nil" : "No Bonus for Breaking Both Partners Nil Bids" } name="with_break_bonus" checked={ this.state.with_break_bonus } onChange={ () => this.toggle("with_break_bonus", true) } disabled={ !this.state.editable } />
        </l.ListItem>
        <l.ListItem onClick={(e) => e.target === e.currentTarget && this.toggle("with_triple_nil") } disabled={ !this.state.editable }>
          <Switch label={ this.state.with_triple_nil ? "Allow Triple Nil Bids (Blind Nil Play -- Chose Played Suit Only)" : "Forbid Triple Nil Bids" } name="with_triple_nil" checked={ this.state.with_triple_nil } onChange={ () => this.toggle("with_triple_nil", true) } disabled={ !this.state.editable } />
        </l.ListItem>
        <l.ListGroupSubheader>
          Scoring Options
        </l.ListGroupSubheader>
        <l.ListItem disabled>
          <TextField fullwidth type="number" label="Winning Point Threshhold" name="win_amount" value={ this.state.win_amount } onChange={ this.inputHandler("win_amount") } min="50" max="1000" step="1" disabled={ !this.state.editable } />
        </l.ListItem>
        <Select label="Overtake Penalty" enhanced value={ ""+this.state.overtake_penalty+"" } onChange={ this.inputHandler("overtake_penalty") }  disabled={ !this.state.editable } options={
          [
            {
              label: '50 Points',
              value: "50",
            },
            {
              label: '100 Points',
              value: "100",
            },
            {
              label: '150 Points',
              value: "150",
            },
            {
              label: '200 Points',
              value: "200",
            },
          ]
        } />
        <Select label="Trick Multiplier" enhanced value={ ""+this.state.trick_multipler+"" } onChange={ this.inputHandler("trick_multipler") }  disabled={ !this.state.editable } options={
          [
            {
              label: '5x',
              value: "5",
            },
            {
              label: '10x',
              value: "10",
            },
          ]
        } />
        <l.ListItem onClick={(e) => e.target === e.currentTarget && this.toggle("perfect_round") } disabled={ !this.state.editable }>
          <Switch label={ this.state.perfect_round ? "Score Half of Winning Amount for a Perfect Round (Moon or Boston; taking all 13 tricks)" : "Score No Additional Points for a Perfect Round" } name="perfect_round" checked={ this.state.perfect_round } onChange={ () => this.toggle("perfect_round", true) } disabled={ !this.state.editable } />
        </l.ListItem>
        <Select label="Single Nil Score" enhanced value={ ""+this.state.nil_score+"" } onChange={ this.inputHandler("nil_score") }  disabled={ !this.state.editable } options={
          [
            {
              label: '50 Points',
              value: "50",
            },
            {
              label: '75 Points',
              value: "75",
            },
            {
              label: '100 Points',
              value: "100",
            },
            {
              label: '125 Points',
              value: "125",
            },
            {
              label: '150 Points',
              value: "150",
            },
            {
              label: '200 Points',
              value: "200",
            },
          ]
        } />
      </>
    );
  }

  renderThreeThirteen() {
    return (
      <>
        <l.ListGroupSubheader>Game Options</l.ListGroupSubheader>
        <l.ListItem disabled>
          <TextField fullwidth type="number" label="Number of Players" name="num_players" value={ this.state.num_players } onChange={ this.inputHandler("num_players") } min="1" max="15" step="1" disabled={ !this.state.editable } />
        </l.ListItem>
        <l.ListItem disabled>
          <TextField fullwidth type="number" label="Minimum Extra Cards (Per Player)" name="min_draw_size" value={ this.state.min_draw_size } onChange={ this.inputHandler("min_draw_size") } min="8" max="20" step="1" disabled={ !this.state.editable } />
        </l.ListItem>
        <l.ListItem onClick={(e) => e.target === e.currentTarget && this.toggle("add_jokers") } disabled={ !this.state.editable }>
          <Switch label={ this.state.add_jokers ? "Add Jokers as Permanent Wild Cards" : "Leave Jokers Out" } name="add_jokers" checked={ this.state.add_jokers } onChange={ () => this.toggle("add_jokers", true) } disabled={ !this.state.editable } />
        </l.ListItem>
        <l.ListGroupSubheader>Set (Grouping) Options</l.ListGroupSubheader>
        <l.ListItem onClick={(e) => e.target === e.currentTarget && this.toggle("allow_mostly_wild") } disabled={ !this.state.editable }>
          <Switch label={ this.state.allow_mostly_wild ? "Allow Sets with More Wild Cards" : "Require Fewer or Equal Wild Cards in a Set" } name="allow_mostly_wild" checked={ this.state.allow_mostly_wild } onChange={ () => this.toggle("allow_mostly_wild", true) } disabled={ !this.state.editable } />
        </l.ListItem>
        <l.ListItem onClick={(e) => e.target === e.currentTarget && this.toggle("allow_all_wild_cards") } disabled={ !this.state.editable }>
          <Switch label={ this.state.allow_all_wild_cards ? "Allow Sets with Only Wild Cards" : "Require at Least One Non-Wild Card in a Set" } name="allow_all_wild_cards" checked={ this.state.allow_all_wild_cards } onChange={ () => this.toggle("allow_all_wild_cards", true) } disabled={ !this.state.editable } />
        </l.ListItem>
        <l.ListItem onClick={(e) => e.target === e.currentTarget && this.toggle("same_suit_runs") } disabled={ !this.state.editable }>
          <Switch label={ this.state.same_suit_runs ? "Require Runs to be of the Same Suit" : "Allow Mixed-Suit Runs" } name="same_suit_runs" checked={ this.state.same_suit_runs } onChange={ () => this.toggle("same_suit_runs", true) } disabled={ !this.state.editable } />
        </l.ListItem>
        <l.ListGroupSubheader>Laying Down Options</l.ListGroupSubheader>
        <l.ListItem disabled>
          <TextField fullwidth type="number" label="Laying Down Limit" name="laying_down_limit" value={ this.state.laying_down_limit } onChange={ this.inputHandler("laying_down_limit") } min="0" max="20" step="1" disabled={ !this.state.editable } />
        </l.ListItem>
        <l.ListItem onClick={(e) => e.target === e.currentTarget && this.toggle("allow_big_gin") } disabled={ !this.state.editable }>
          <Switch label={ this.state.allow_big_gin ? "Allow Laying Down Without Discarding" : "Always Discard Before Going Out" } name="allow_big_gin" checked={ this.state.allow_big_gin } onChange={ () => this.toggle("allow_big_gin", true) } disabled={ !this.state.editable } />
        </l.ListItem>
        <l.ListItem onClick={(e) => e.target === e.currentTarget && this.toggle("with_fourteenth_round") } disabled={ !this.state.editable }>
          <Switch label={ this.state.with_fourteenth_round ? "Play an Extra Round with No Extra Wild Cards" : "Stick to Thirteen Rounds (Kings Wild)" } name="with_fourteenth_round" checked={ this.state.with_fourteenth_round } onChange={ () => this.toggle("with_fourteenth_round", true) } disabled={ !this.state.editable } />
        </l.ListItem>
        <l.ListGroupSubheader>Scoring Options</l.ListGroupSubheader>
        <l.ListItem disabled>
          <TextField fullwidth type="number" label="Early End Score" name="num_players" value={ this.state.to_point_limit } onChange={ this.inputHandler("to_point_limit") } disabled={ !this.state.editable } />
        </l.ListItem>
        <l.ListItem onClick={(e) => e.target === e.currentTarget && this.toggle("golf_scoring") } disabled={ !this.state.editable }>
          <Switch label={ this.state.golf_scoring ? "Count Points Against Yourself" : "Give Points to Player Laying Down" } name="golf_scoring" checked={ this.state.golf_scoring } onChange={ () => this.toggle("golf_scoring", true) } disabled={ !this.state.editable } />
        </l.ListItem>
      </>
    );
  }

  renderEightJacks() {
    return (
      <>
        <l.ListGroupSubheader>Game Options</l.ListGroupSubheader>
        <l.ListItem disabled>
          <TextField fullwidth type="number" label="Number of Players" name="num_players" value={ this.state.num_players } onChange={ this.inputHandler("num_players") } min="2" max="8" step="1" disabled={ !this.state.editable } />
        </l.ListItem>
        <l.ListItem disabled>
          <TextField fullwidth type="number" label="Run Length" name="run_length" value={ this.state.run_length } onChange={ this.inputHandler("run_length") } min="4" max="6" step="1" disabled={ !this.state.editable } />
        </l.ListItem>
        <l.ListItem disabled>
          <TextField fullwidth type="number" label="Win Limit" name="win_limit" value={ this.state.win_limit } onChange={ this.inputHandler("win_limit") } min="1" max="5" step="1" disabled={ !this.state.editable } />
        </l.ListItem>
        <l.ListGroupSubheader>Board Options</l.ListGroupSubheader>
        <l.ListItem disabled>
          <TextField fullwidth type="number" label="Board Width" name="board_width" value={ this.state.board_width } onChange={ this.inputHandler("board_width") } min="8" max="10" step="1" disabled={ !this.state.editable } />
        </l.ListItem>
        <l.ListItem disabled>
          <TextField fullwidth type="number" label="Board Height" name="board_height" value={ this.state.board_height } onChange={ this.inputHandler("board_height") } min="8" max="10" step="1" disabled={ !this.state.editable } />
        </l.ListItem>
        <l.ListItem onClick={(e) => e.target === e.currentTarget && this.toggle("remove_unused") } disabled={ !this.state.editable }>
          <Switch label={ this.state.remove_unused ? "Remove Cards not Used on the Board from the Deck" : "Keep All Cards (Even Those Not Present on the Board)" } name="remove_unused" checked={ this.state.remove_unused } onChange={ () => this.toggle("remove_unused", true) } disabled={ !this.state.editable } />
        </l.ListItem>
        <l.ListItem onClick={(e) => e.target === e.currentTarget && this.toggle("wild_corners") } disabled={ !this.state.editable }>
          <Switch label={ this.state.wild_corners ? "Add Wild Cards in the Corners" : "Don't Fill In Corners with Wild Cards" } name="wild_corners" checked={ this.state.wild_corners } onChange={ () => this.toggle("wild_corners", true) } disabled={ !this.state.editable } />
        </l.ListItem>
        <l.ListGroupSubheader>Hand Options</l.ListGroupSubheader>
        <l.ListItem disabled>
          <TextField fullwidth type="number" label="Hand Size" name="hand_size" value={ this.state.hand_size } onChange={ this.inputHandler("hand_size") } min="4" max="10" step="1" disabled={ !this.state.editable } />
        </l.ListItem>
        <l.ListItem disabled>
          <TextField fullwidth type="number" label="Joker Count" name="joker_count" value={ this.state.joker_count } onChange={ this.inputHandler("joker_count") } min="0" max="10" step="1" disabled={ !this.state.editable } />
        </l.ListItem>
      </>
    );
  }

    renderHearts() {
      return (
        <>
          <l.ListGroupSubheader>Game Options</l.ListGroupSubheader>
          <l.ListItem disabled>
            <TextField fullwidth type="number" label="Number of Players" name="num_players" value={ this.state.num_players } onChange={ this.inputHandler("num_players") } min="3" max="7" step="1" disabled={ !this.state.editable } />
          </l.ListItem>
          <l.ListGroupSubheader>Playing Options</l.ListGroupSubheader>
          <l.ListItem disabled>
            <TextField fullwidth type="number" label="Number of Cards to Pass" name="number_to_pass" value={ this.state.number_to_pass } onChange={ this.inputHandler("number_to_pass") } min="1" max="5" step="1" disabled={ !this.state.editable } />
          </l.ListItem>
          <l.ListItem onClick={(e) => e.target === e.currentTarget && this.toggle("hold_round") } disabled={ !this.state.editable }>
            <Switch label={ this.state.hold_round ? "Pass Left, Right, then Hold (non-Four Players Only)" : "Only Pass Left and Right (non-Four Players Only)" } name="hold_round" checked={ this.state.hold_round } onChange={ () => this.toggle("hold_round", true) } disabled={ !this.state.editable } />
          </l.ListItem>
          <l.ListItem onClick={(e) => e.target === e.currentTarget && this.toggle("must_break_hearts") } disabled={ !this.state.editable }>
            <Switch label={ this.state.must_break_hearts ? "Hearts Must be Broken Before Being Lead" : "Can Lead Hearts at Any Time" } name="must_break_hearts" checked={ this.state.must_break_hearts } onChange={ () => this.toggle("must_break_hearts", true) } disabled={ !this.state.editable } />
          </l.ListItem>
          <l.ListItem onClick={(e) => e.target === e.currentTarget && this.toggle("black_widow_breaks") } disabled={ !this.state.editable }>
            <Switch label={ this.state.black_widow_breaks ? "Black Widow (Queen of Spades) Breaks Hearts" : "Black Widow Doesn't Break Hearts" } name="black_widow_breaks" checked={ this.state.black_widow_breaks } onChange={ () => this.toggle("black_widow_breaks", true) } disabled={ !this.state.editable } />
          </l.ListItem>
          <l.ListItem onClick={(e) => e.target === e.currentTarget && this.toggle("first_trick_hearts") } disabled={ !this.state.editable }>
            <Switch label={ this.state.first_trick_hearts ? "Can Sluff Points on the First Trick" : "Can't Play Points on the First Trick" } name="first_trick_hearts" checked={ this.state.first_trick_hearts } onChange={ () => this.toggle("first_trick_hearts", true) } disabled={ !this.state.editable } />
          </l.ListItem>
          <l.ListItem onClick={(e) => e.target === e.currentTarget && this.toggle("with_crib") } disabled={ !this.state.editable }>
            <Switch label={ this.state.with_crib ? "Put Extra Cards in a Crib (Taken with First Trick)" : "Remove Cards To Deal Evenly" } name="with_crib" checked={ this.state.with_crib } onChange={ () => this.toggle("with_crib", true) } disabled={ !this.state.editable } />
          </l.ListItem>
          <l.ListGroupSubheader>Scoring Options</l.ListGroupSubheader>
          <l.ListItem disabled>
            <TextField fullwidth type="number" label="Ending Amount" name="win_amount" value={ this.state.win_amount } onChange={ this.inputHandler("win_amount") } min="50" max="250" step="1" disabled={ !this.state.editable } />
          </l.ListItem>
          <l.ListItem onClick={(e) => e.target === e.currentTarget && this.toggle("shoot_moon_reduces") } disabled={ !this.state.editable }>
            <Switch label={ this.state.wild_corners ? "Shooting the Moon Reduces Your Score" : "Shooting the Moon Increases Other Players' Scores" } name="shoot_moon_reduces" checked={ this.state.shoot_moon_reduces } onChange={ () => this.toggle("shoot_moon_reduces", true) } disabled={ !this.state.editable } />
          </l.ListItem>
          <l.ListItem onClick={(e) => e.target === e.currentTarget && this.toggle("shoot_the_sun") } disabled={ !this.state.editable }>
            <Switch label={ this.state.shoot_the_sun ? "Score Double for Shooting the Sun (Taking All Tricks)" : "No Bonus for Shooting the Sun" } name="shoot_the_sun" checked={ this.state.shoot_the_sun } onChange={ () => this.toggle("shoot_the_sun", true) } disabled={ !this.state.editable } />
          </l.ListItem>
          <l.ListItem onClick={(e) => e.target === e.currentTarget && this.toggle("jack_of_dimaonds") } disabled={ !this.state.editable }>
            <Switch label={ this.state.jack_of_dimaonds ? "Taking the Jack of Diamonds Reduces Your Score by 11" : "No Bonus For Taking the Jack of Diamonds" } name="jack_of_dimaonds" checked={ this.state.jack_of_dimaonds } onChange={ () => this.toggle("jack_of_dimaonds", true) } disabled={ !this.state.editable } />
          </l.ListItem>
          <l.ListItem onClick={(e) => e.target === e.currentTarget && this.toggle("ten_of_clubs") } disabled={ !this.state.editable }>
            <Switch label={ this.state.ten_of_clubs ? "Taking the Ten of Clubs Doubles Your Score for the Round" : "Ten of Clubs Doesn't Double Your Score for the Round" } name="ten_of_clubs" checked={ this.state.ten_of_clubs } onChange={ () => this.toggle("ten_of_clubs", true) } disabled={ !this.state.editable } />
          </l.ListItem>
          <l.ListItem onClick={(e) => e.target === e.currentTarget && this.toggle("black_widow_for_five") } disabled={ !this.state.editable }>
            <Switch label={ this.state.black_widow_for_five ? "Black Widow Counts as 5" : "Black Widow Counts as 13" } name="black_widow_for_five" checked={ this.state.black_widow_for_five } onChange={ () => this.toggle("black_widow_for_five", true) } disabled={ !this.state.editable } />
          </l.ListItem>
          <l.ListItem onClick={(e) => e.target === e.currentTarget && this.toggle("ace_of_hearts") } disabled={ !this.state.editable }>
            <Switch label={ this.state.ace_of_hearts ? "Ace of Hearts Counts as 5" : "Ace of Hearts Counts as 1" } name="ace_of_hearts" checked={ this.state.ace_of_hearts } onChange={ () => this.toggle("ace_of_hearts", true) } disabled={ !this.state.editable } />
          </l.ListItem>
          <l.ListItem onClick={(e) => e.target === e.currentTarget && this.toggle("no_trick_bonus") } disabled={ !this.state.editable }>
            <Switch label={ this.state.no_trick_bonus ? "Taking No Tricks Reduces Your Score By 5" : "No Bonus for Taking No Tricks" } name="no_trick_bonus" checked={ this.state.no_trick_bonus } onChange={ () => this.toggle("no_trick_bonus", true) } disabled={ !this.state.editable } />
          </l.ListItem>
          <l.ListItem onClick={(e) => e.target === e.currentTarget && this.toggle("hundred_to_half") } disabled={ !this.state.editable }>
            <Switch label={ this.state.hundred_to_half ? "Hitting Exactly The Ending Amount Halves Your Score" : "No Prize for Hitting Exactly the End Amount" } name="hundred_to_half" checked={ this.state.hundred_to_half } onChange={ () => this.toggle("hundred_to_half", true) } disabled={ !this.state.editable } />
          </l.ListItem>
        </>
      );
  }

  render() {
    var messages = {
      'rush': "In Rush, when one player draws a tile, all players must draw tiles and catch up – first to finish their board when there are no more tiles left wins!",
      'spades': "In Spades, players bid how many tricks they will take. If they make their bid, they get more points. First to a set amount wins!"
    }

    var config = null;
    if (this.state.mode === 'rush') {
      config = this.renderRush();
    } else if (this.state.mode === 'spades') {
      config = this.renderSpades();
    } else if (this.state.mode === 'three thirteen') {
      config = this.renderThreeThirteen();
    } else if (this.state.mode === 'eight jacks') {
      config = this.renderEightJacks();
    } else if (this.state.mode === 'hearts') {
      config = this.renderHearts();
    } else if (this.state.mode !== null) {
      console.log("Unknown game mode: " + this.state.mode, this.state);
    }

    return (
      <c.Card>
        <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
          <form onSubmit={ this.handleSubmit.bind(this) }>
            <l.List twoLine>
              <l.ListGroup>
                <l.ListGroupSubheader>Player Options</l.ListGroupSubheader>
                <l.ListItem onClick={(e) => e.target === e.currentTarget && this.toggle("open") } disabled={ !this.state.editable }>
                  <Switch label="Open for anyone to join (or just those invited)" checked={ this.state.open } onChange={ () => this.toggle("open", true) } disabled={ !this.state.editable } />
                </l.ListItem>
                <l.ListItem onClick={(e) => e.target === e.currentTarget && this.toggle("spectators") } disabled={ !this.state.editable }>
                  <Switch label="Allow spectators" checked={ this.state.spectators } onChange={ () => this.toggle("spectators", true) } disabled={ !this.state.editable } />
                </l.ListItem>
              </l.ListGroup>
              <br />
              <br />
              <l.ListGroup>
                <l.ListGroupSubheader>Game Mode</l.ListGroupSubheader>
                <Select label="Game Mode" enhanced value={ this.state.mode } onChange={ this.inputHandler("mode") }  disabled={ !this.state.editable } options={
                  [
                    {
                      label: 'Rush (Fast-Paced Word Game)',
                      value: 'rush',
                    },
                    {
                      label: 'Spades (Card Game)',
                      value: 'spades',
                    },
                    {
                      label: 'Hearts (Card Game)',
                      value: 'hearts',
                    },
                    {
                      label: 'Three Thirteen (Card Game)',
                      value: 'three thirteen',
                    },
                    {
                      label: 'Eight Jacks (Card Game)',
                      value: 'eight jacks',
                    },
                  ]
                } />
                <br/>
                {
                  this.state.mode in messages ? <p> { messages[this.state.mode] } </p> : null
                }
              </l.ListGroup>
              <br />
              <br />
              <l.ListGroup>
                { config }
              </l.ListGroup>
            </l.List>
            { this.state.editable ? <Button label="Create" raised disabled={ !this.state.editable || this.state.mode === null } /> : <></> }
          </form>
          <d.Dialog open={ this.state.error !== null } onClosed={() => this.setError(null) }>
            <d.DialogTitle>Error!</d.DialogTitle>
            <d.DialogContent>{ this.state.error }</d.DialogContent>
            <d.DialogActions>
              <d.DialogButton action="close" theme="secondary">OK</d.DialogButton>
            </d.DialogActions>
          </d.Dialog>
        </div>
      </c.Card>
    );
  }
}

class CreateGamePage extends React.Component {
  render() {
    return (
      <div className="App-page">
        <div>
          <Typography use="headline2">Create a Game</Typography>
          <p>
            Invite your friends to play online with you!<br />
          </p>
        </div>
        <g.Grid fixedColumnWidth={ true }>
          <g.GridCell align="left" span={3} tablet={8} />
          <g.GridCell align="middle" span={6} tablet={8}>
            <CreateGameForm {...this.props} />
          </g.GridCell>
        </g.Grid>
      </div>
    );
  }
}


class CreateRoomForm extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      error: null,
      mode: 'single',
      open: true,
    }
  }

  async handleSubmit(event) {
    event.preventDefault();

    if (this.props.user === null || !this.props.user.authed) {
      this.setError("Need to have a user account before doing this action!");
      return;
    }

    var room = new RoomModel(this.props.user);
    room.mode = this.state.mode;
    room.open = this.state.open;

    await room.create();

    if (room.error !== null) {
      this.setError(room.error.message);
    } else {
      this.props.setRoom(room);
      this.props.setGame(null);
      this.props.setPage('room');
    }
  }

  newState(fn, cb) {
    return this.setState(state => Object.assign({}, state, fn(state)));
  }

  inputHandler(name, checky) {
    return (e) => {
      var v = checky ? e.target.checked : e.target.value;
      return this.newState(() => ({ [name]: v }));
    };
  }

  toggle(name) {
    this.newState(state => ({ [name]: !state[name] }));
  }

  setError(message) {
    this.setState(state => Object.assign({}, state, { error: message }));
  }

  render() {
    return (
      <c.Card>
        <div style={{ padding: '1rem 1rem 1rem 1rem' }} >

          <form onSubmit={ this.handleSubmit.bind(this) }>
            <l.List twoLine>
              <l.ListGroup>
                <l.ListGroupSubheader>Joining Options</l.ListGroupSubheader>
                <l.ListItem onClick={(e) => e.target === e.currentTarget && this.toggle("open") }><Switch label={ this.state.open ? "Open for anyone to join if they have the room code" : "Generate unique invite codes for everyone" } checked={ this.state.open } onChange={ () => this.toggle("open", true) } /></l.ListItem>
              </l.ListGroup>
              <br />
              <br />
              <l.ListGroup>
                <l.ListGroupSubheader>Game Options</l.ListGroupSubheader>
                <Select label="Game Mode" enhanced value={ this.state.mode } onChange={ this.inputHandler("mode") } options={
                  [
                    {
                      label: 'Single (Only one game)',
                      value: 'single',
                    },
                    {
                      label: 'Dynamic (Play multiple types of games)',
                      value: 'dynamic',
                    }
                  ]
                } />
                <br/>
                {
                  this.state.mode === 'rush' ?
                  <p>In rush mode, when one player draws a tile, all players must draw tiles and catch up – first to finish their board when there are no more tiles left wins!</p>
                  : <></>
                }
              </l.ListGroup>
            </l.List>

            <Button label="Create" raised />
          </form>
          <d.Dialog open={ this.state.error !== null } onClosed={() => this.setError(null) }>
            <d.DialogTitle>Error!</d.DialogTitle>
            <d.DialogContent>{ this.state.error }</d.DialogContent>
            <d.DialogActions>
              <d.DialogButton action="close" theme="secondary">OK</d.DialogButton>
            </d.DialogActions>
          </d.Dialog>
        </div>
      </c.Card>
    );
  }
}

class CreateRoomPage extends React.Component {
  render() {
    return (
      <div className="App-page">
        <Typography use="headline2">Create a Game Room</Typography>
        <p>
          Invite your friends to play online with you!
          This way, you'll be able to play multiple games without having to
          re-share a link.
        </p>
        <g.Grid fixedColumnWidth={ true }>
          <g.GridCell align="left" span={3} tablet={8} />
          <g.GridCell align="middle" span={6} tablet={8}>
            <CreateRoomForm {...this.props} />
          </g.GridCell>
        </g.Grid>
      </div>
    );
  }
}

class JoinGamePage extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      error: null,
      code: normalizeCode(undefined, true) || "",
    }

    this.guest = React.createRef();
  }

  async handleSubmit(event) {
    event.preventDefault();

    if (this.props.user === null || !this.props.user.authed) {
      this.setError("Need to have a user account before doing this action! Perhaps you'd like to play as a guest?");
      return;
    }

    var try_game = this.state.code[0] === "g" && (this.state.code[1] === "c" || this.state.code[1] === "p") && this.state.code[2] === '-';
    var try_room = this.state.code[0] === "r" && (this.state.code[1] === "c" || this.state.code[1] === "p") && this.state.code[2] === '-';

    if (!try_game && !try_room) {
      try_game = true;
      try_room = true;
    }

    if (try_game) {
      var game = await GameModel.FromCode(this.props.user, this.state.code);
      if (game.error === undefined || game.error === null) {
        this.props.setGame(game);
        this.props.setPage('play', '?code=' + game.code);
        return;
      }

      if (game.error !== null && !try_room) {
        console.error(game.error);
        this.setError(game.error.message);
        return;
      }
    }

    if (try_room) {
      // Try loading it as a room instead, before displaying the game error page.
      var room = await RoomModel.FromCode(this.props.user, this.state.code);
      if (room.error === undefined || room.error === null) {
        this.props.setPage('room', '?code=' + room.code);
      }

      if (room.error !== null) {
        console.error(room.error);
        this.setError(room.error.message);
      }
    }
  }

  async handleGuestSubmit(event) {
    event.preventDefault();

    var user = new UserModel()
    user.display = this.guest.current.value;

    if (!user.display) {
      this.setError("Please specify a name for the guest account");
    }

    await user.createGuest();

    if (user.error !== null) {
      console.error(user.error);
      this.setError(user.error.message);
    } else {
      this.props.setUser(user);
      this.props.setPage('play');
    }
  }

  newState(fn, cb) {
    return this.setState(state => Object.assign({}, state, fn(state)));
  }

  inputHandler(name, checky) {
    return (e) => {
      var v = checky ? e.target.checked : e.target.value;
      return this.newState(() => ({ [name]: v }));
    };
  }

  toggle(name) {
    this.newState(state => ({ [name]: !state[name] }));
  }

  setError(message) {
    this.setState(state => Object.assign({}, state, { error: message }));
  }

  render() {
    let right_column = null;

    if (!this.props.user || !this.props.user.authed) {
      right_column = <>
        <LoginForm {...this.props} />
      </>
  } else if (!this.props.user.guest) {
      right_column = [];
      if (this.props.user.can_create_room) {
        right_column.push(
          <div key="host-room" style={{ padding: '1rem 0px 1rem 0px' }}>
            <c.Card>
              <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
                <div>
                  <Typography use="headline3">Host a Room</Typography>
                  <p>
                    <Link to="/create/room">Looking to make a new room? Create one here!</Link><br /><br />
                    A room lets you play multiple games without having to share a new link every time!
                  </p>
                </div>
              </div>
            </c.Card>
          </div>
        );
      }

      if (this.props.user.can_create_game) {
        right_column.push(
          <div key="host-game" style={{ padding: '1rem 0px 1rem 0px' }}>
            <c.Card>
              <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
                <div>
                  <Typography use="headline3">Host a Single Game</Typography>
                  <p>
                    <Link to="/create/game">Looking to play a single game with some friends? Make one here!</Link>
                  </p>
                </div>
              </div>
            </c.Card>
          </div>
        );
      }

      if (!this.props.user.can_create_room && !this.props.user.can_create_game) {
        right_column = <div style={{ padding: '1rem 0px 1rem 0px' }}>
          <c.Card>
            <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
              <div>
                <Typography use="headline3">Trying to create a room or a game?</Typography>
                <p>
                  In order to create rooms and games, <Link to="/pricing">purchase
                  a plan</Link> first.
                </p>
              </div>
            </div>
          </c.Card>
        </div>
      }
    } else {
      right_column = <div style={{ padding: '1rem 0px 1rem 0px' }}>
        <c.Card>
          <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
            <div>
              <Typography use="headline3">Upgrade Your Account</Typography>
              <p>
                You are currently playing as a guest. In order to create your
                own games, <Link to="/profile">upgrade your account</Link> to a
                full account.
              </p>
            </div>
          </div>
        </c.Card>
      </div>;
    }

    let inner = <g.GridRow>
      <g.GridCell align="left" span={6} tablet={8}>
        <c.Card>
          <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
            <div>
              <Typography use="headline3">Join an Existing Room or Game</Typography>
              <p>
                Good luck, and may the odds be ever in your favor!<br /><br />
              Need a refresher on <Link to="/rules/rush">the rules</Link> or want
                to check out <Link to="/docs">the documentation</Link>?
              </p>
            </div>

            <form onSubmit={ this.handleSubmit.bind(this) }>
              <l.List twoLine>
                <l.ListGroup>
                  <l.ListGroupSubheader>Join game</l.ListGroupSubheader>
                  <l.ListItem disabled><TextField fullwidth placeholder="Secret Passcode" name="num_players" value={ this.state.code } onChange={ this.inputHandler("code") } /></l.ListItem>
                </l.ListGroup>
              </l.List>

              <Button label="Join" raised />
            </form>
            <d.Dialog open={ this.state.error !== null } onClosed={() => this.setError(null) }>
              <d.DialogTitle>Error!</d.DialogTitle>
              <d.DialogContent>{ this.state.error?.message || this.state.error }</d.DialogContent>
              <d.DialogActions>
                <d.DialogButton action="close" theme="secondary">OK</d.DialogButton>
              </d.DialogActions>
            </d.Dialog>
          </div>
        </c.Card>
      </g.GridCell>
      <g.GridCell align="right" span={6} tablet={8}>
        { right_column }
      </g.GridCell>
    </g.GridRow>;

    return (
      <div className="App-page">
        <div>
          <Typography use="headline2">Play a Game</Typography>
          <p>
            Whether or not you're looking to start a new game or join an
            existing one, you've found the right place.
          </p>
        </div>
        {
          !this.props.user ? <g.Grid fixedColumnWidth={ true }><g.GridRow>
            <g.GridCell align="left" span={3} tablet={8} />
            <g.GridCell align="middle" span={6} tablet={8}>
              <c.Card>
                <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
                  <Typography use="headline3">Join as Guest</Typography>
                  <p>
                    Since you're not <Link to="/login">logged in</Link>, how about
                    playing as a guest for now? You can always upgrade your
                    account later. Note that you'll need to create a full
                    account to host your own games.
                  </p>
                  <form onSubmit={ this.handleGuestSubmit.bind(this) }>
                    <TextField fullwidth placeholder="name" name="guest" inputRef={ this.guest } required /><br />
                    <Button label="Play as Guest" raised />
                  </form>
                </div>
              </c.Card>
            </g.GridCell>
          </g.GridRow>
          <br /><br />{ inner }</g.Grid> : <g.Grid fixedColumnWidth={ true }>{ inner }</g.Grid>
        }
      </div>
    );
  }
}

export {
  loadGame,
  addEv,
  notify,
  killable,
  AfterPartyPage,
  CreateGamePage,
  CreateGameForm,
  CreateRoomPage,
  JoinGamePage,
  PreGamePage,
  RushGamePage,
  GamePage,
};
