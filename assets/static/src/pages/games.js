// Library imports
import React from 'react';

import {
  Link,
} from "react-router-dom";

import { Button } from '@rmwc/button';
import '@rmwc/button/styles';
import { IconButton } from '@rmwc/icon-button';
import '@rmwc/icon-button/styles';
import * as c from '@rmwc/card';
import '@rmwc/card/styles';
import * as d from '@rmwc/dialog';
import '@rmwc/dialog/styles';
import * as g from '@rmwc/grid';
import '@rmwc/grid/styles';
import * as l from '@rmwc/list';
import '@rmwc/list/styles';
import { Select } from '@rmwc/select';
import '@rmwc/select/styles';
import { Switch } from '@rmwc/switch';
import '@rmwc/switch/styles';
import { Typography } from '@rmwc/typography';
import '@rmwc/typography/styles';
import { TextField } from '@rmwc/textfield';
import '@rmwc/textfield/styles';

// Application imports
import '../App.css';
import { UserModel, RoomModel, GameModel, normalizeCode } from '../models.js';
import { LoginForm } from './login.js';
import { RushGame } from '../games/rush.js';
import { RushGamePage, RushAfterPartyPage } from './games/rush.js';
import { SpadesGame } from '../games/spades.js';
import { SpadesGamePage, SpadesAfterPartyPage } from './games/spades.js';
import { ThreeThirteenGame } from '../games/threethirteen.js';
import { ThreeThirteenGamePage, ThreeThirteenAfterPartyPage } from './games/threethirteen.js';
import { HeartsGame } from '../games/hearts.js';
import { HeartsGamePage, HeartsAfterPartyPage } from './games/hearts.js';
import { EightJacksGame } from '../games/eightjacks.js';
import { EightJacksGamePage, EightJacksAfterPartyPage } from './games/eightjacks.js';
import { GinGame } from '../games/gin.js';
import { GinGamePage, GinAfterPartyPage } from './games/gin.js';
import { UserCache } from '../utils/cache.js';

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
    } else if (mode === "eight jacks") {
      game.interface = new EightJacksGame(game);
    } else if (mode === "gin") {
      game.interface = new GinGame(game);
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
    timeout: type === "error" ? 7000 : 3000,
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
    var game = loadGame(this.props.game);
    this.props.setGame(game);
  }
  async componentDidMount() {
    await this.props.game.update();

    this.game = loadGame(this.props.game);
    this.props.setGame(this.game);
    let code = this.props.room?.code || this.props.game?.code;
    code = code ? "?code=" + code : true;
    if (this.props.game.lifecycle === 'playing') {
      this.props.setPage('/playing', code);
    } else if (this.props.game.lifecycle === 'finished') {
      this.props.setPage('/afterparty', code);
    } else if (this.props.game.lifecycle === 'pending') {
      this.props.setPage('/play', code);
    }
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
    } else if (mode === 'eight jacks') {
      return <EightJacksGamePage {...this.props}/>
    } else if (mode === 'gin') {
      return <GinGamePage {...this.props}/>
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
  async componentDidMount() {
    await this.props.game.update();

    this.game = loadGame(this.props.game);
    this.props.setGame(this.game);
    let code = this.props.room?.code || this.props.game?.code;
    code = code ? "?code=" + code : true;
    if (this.props.game.lifecycle === 'playing') {
      this.props.setPage('/playing', code);
    } else if (this.props.game.lifecycle === 'finished') {
      this.props.setPage('/afterparty', code);
    } else if (this.props.game.lifecycle === 'pending') {
      this.props.setPage('/play', code);
    }
  }
  render() {
    return this.admin ? <PreGameAdminPage {...this.props} /> : <PreGameUserPage {...this.props} />
  }
}

class AfterPartyPage extends React.Component {
  constructor(props) {
    super(props);
    this.game = loadGame(this.props.game);
    this.props.setGame(this.game);
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
    } else if (mode === 'eight jacks') {
      return <EightJacksAfterPartyPage {...this.props}/>
    } else if (mode === 'gin') {
      return <GinAfterPartyPage {...this.props}/>
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
        this.props.setNotification("Starting!");
        setTimeout(() => this.props.setNotification(null), 2000);
        window.scrollTo(0, 0);
        data.message = "Let the games begin!";
        notify(this.props.snackbar, data.message, data.type);
        this.props.game.lifecycle = "playing";
        if (data.playing) {
          this.props.setPage('playing', true);
        } else {
          this.props.setPage('afterparty', true);
        }
      },
      "countdown": data => {
        this.props.setNotification(data.value + "...");
        window.scrollTo(0, 0);
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
        this.props.setPage('afterparty', true);
      },
      "": data => {
        console.log(data);
        if (data.message) {
          notify(this.props.snackbar, data.message, data.type);
        }
      },
    });
  }
  componentWillUnmount() {
    if (this.unmount) this.unmount();
  }
  toggleSpectator(user) {
    for (let u in this.state.players) {
      if (this.state.players[u] === user) {
        user.playing = !user.playing;

        this.game.interface.controller.admitPlayer(user.user_id, true, user.playing);
      }
    }

    this.setState(state => Object.assign({}, state, { players: this.state.players }));
  }
  render() {
    let message = "Game is in an unknown state.";
    if (this.state.status === "pending") {
      message = "Please wait to be admitted to the game.";
    } else if (this.state.status === "waiting") {
      message = "Waiting for the game to start...";
    }

    let us = null;
    let users = [];
    if (this.state.players !== null) {
      var i = 0;
      for (let player_id of Object.keys(this.state.players).sort()) {
        let player = this.state.players[player_id];
        let display = player.user.display;
        if (+player_id === +this.props.user.id) {
          display = "You";
          us = player;
        }
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
        {
          message
          ? <p>
              <b>
                { message }
              </b>
            </p>
          : null
        }
        {
          this.state.status !== "pending"
          ? <>
              {
                us !== null
                ? <Button raised label={ us.playing ? "Spectate" : "Play" }
                    onClick={ () => this.toggleSpectator(us) }
                  />
                : null
              }
              <l.List>
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
            </>
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
          <h1>Game #{ this.props.game.id } - { this.props.game.style }</h1>
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
        <h1>Game #{ this.props.game.id } - { this.props.game.style }</h1>
        { content }
      </div>
    );
  }
}

class PreGameAdminPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      waitlist: [Object.assign({}, this.props.user, { admitted: true, playing: false, connected: false, team: null })],
      started: false,
      countdown: null,
      order: true,
      teams: true,
    };

    this.game = this.props.game || {};
    this.props.setGame(loadGame(this.game));

    this.state.teams = !!this.game.interface.hasTeams;

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

        this.sortUsers();
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
        this.props.setNotification("Starting!");
        setTimeout(() => this.props.setNotification(null), 2000);
        window.scrollTo(0, 0);
        data.message = "Let the games begin!";
        notify(this.props.snackbar, data.message, data.type);
        this.props.game.lifecycle = "playing";
        if (data.playing) {
          this.props.setPage('playing', true);
        } else {
          this.props.setPage('afterparty', true);
        }
      },
      "countdown": data => {
        this.props.setNotification(data.value + "...");
        window.scrollTo(0, 0);
        data.message = "Game starting in " + data.value;
        this.setState(state => Object.assign({}, state, { countdown: data.value }));
        setTimeout(() => this.setState(state => Object.assign({}, state, { countdown: null })), 1000);
        this.game.interface.controller.wsController.send({'message_type': 'countback', 'value': data.value});
      },
      "finished": async (data) => {
        data.message = await personalize(data.winner) + " won!";
        notify(this.props.snackbar, data.message, data.type);
        this.game.winner = data.winner;
        this.props.setPage('afterparty', true);
      },
      "": data => {
        console.log(data);
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
  sortUsers() {
    this.setState(state => {
      // Do this inside a proper React setState
      // otherwise the input elements get lost in the shuffle
      state.waitlist.sort((a,b) => (
        (b.playing - a.playing) ||
        (b.admitted - a.admitted)
      ));
      return state;
    });
  }
  moveUser(user, up) {
    this.setState(state => {
      var i = state.waitlist.findIndex(u => u === user);
      if (i < 0) return state;
      if (i === 0 && up) return state;
      if (i === state.waitlist.length-1 && !up) return state;
      state.waitlist.splice(i-up, 2, ...state.waitlist.slice(i-up, i+!up+1).reverse());

      state.waitlist.sort((a,b) => (
        (b.playing - a.playing) ||
        (b.admitted - a.admitted)
      ));
      return state;
    });
  }
  setTeam(user, team) {
    for (let u in this.state.waitlist) {
      if (this.state.waitlist[u] === user) {
        user.team = team ? +team : null;

        this.sortUsers();
      }
    }
  }
  toggleAdmitted(user) {
    for (let u in this.state.waitlist) {
      if (this.state.waitlist[u] === user) {
        if (user.id !== this.props.user.id) {
          user.admitted = !user.admitted;
        }

        if (!user.admitted) {
          user.playing = false;
        }

        this.sortUsers();
        this.game.interface.controller.admitPlayer(user.id, user.admitted, user.playing);
      }
    }
  }
  toggleSpectator(user) {
    for (let u in this.state.waitlist) {
      if (this.state.waitlist[u] === user) {
        user.playing = !user.playing;
        if (!user.admitted) {
          user.playing = false;
        }

        this.sortUsers();
        this.game.interface.controller.admitPlayer(user.id, user.admitted, user.playing);
      }
    }
  }
  async assignTeams(verify) {
    if (!this.state.teams) return true;
    var team_data = {};
    team_data.dealer = 0; // TODO
    var players = this.state.waitlist.filter(user => user.playing);
    team_data.num_players = players.length;
    team_data.player_map = players.map(user => user.id);
    var teams = []; var team_by_index = {};
    var assigned = false; var unassigned = false;
    players.forEach((user,i) => {
      if (!user.team) {
        teams.push([i]);
        unassigned = user;
      } else {
        assigned = true;
        if (!team_by_index[user.team]) {
          team_by_index[user.team] = [i];
        } else {
          team_by_index[user.team].push(i);
        }
      }
    });
    for (let t in team_by_index) {
      teams.push(team_by_index[t]);
    }
    team_data.team_assignments = teams;
    console.log(team_data);
    if (verify && assigned && unassigned) {
      notify(this.props.snackbar, "Must assign user " + unassigned.display + " to a team", "error");
      this.setState(state => Object.assign({}, state, { started: false }));
      return false;
    }
    var ret1 = await this.game.interface.controller.assignTeams(team_data);
    if (verify && ret1 && ret1.message_type && ret1.message_type === "error") {
      notify(this.props.snackbar, ret1.error, "error");
      this.setState(state => Object.assign({}, state, { started: false }));
      return false;
    }
    return true;
  }
  async start() {
    this.setState(state => Object.assign({}, state, { started: true }));

    if (!await this.assignTeams(true)) {
      this.setState(state => Object.assign({}, state, { started: false }));
      return;
    }
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

    let teams = [{label:'None',value:null}];
    let max_team = Math.max(...this.state.waitlist.map(u => u.team).filter(isFinite)) || 0;
    for (let i=0; i<=max_team; i+=1) {
      teams.push({label:''+(+i+1), value: +i+1});
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
        </l.List>
      </div>
    </c.Card>;

    let players = this.state.waitlist.filter(user => user.admitted && user.playing);
    let spectators = this.state.waitlist.filter(user => user.admitted && !user.playing);
    let waiting = this.state.waitlist;

    let userContent = <c.Card>
      <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
        <l.List twoLine>
          <l.ListGroup>
            <l.ListItem disabled>
              <h1>Players</h1>
              &nbsp;&nbsp;
              <Switch checked={ this.state.order } label="Order manually" onChange={ () => this.setState(state => Object.assign(state, { order: !state.order })) } />
              &nbsp;&nbsp;
              {/*<Switch checked={ this.state.teams } label="Put into teams" onChange={ () => this.setState(state => Object.assign(state, { teams: !state.teams })) } />*/}
            </l.ListItem>
            { players.map((user, i) =>
                <l.ListItem key={user.id} disabled style={{ height: "auto", minHeight: "72px" }}>
                  <span className="unselectable">{+i + 1}.&nbsp;</span> {user.display}{user.id === this.props.user.id ? " (You)" : ""}
                  <l.ListItemMeta>
                    { user.id === this.props.user.id
                      ? null
                      : <>
                          <Button raised label="Kick out" onClick={ () => this.toggleAdmitted(user) } />
                          &nbsp;
                        </>
                    }
                    <Button raised label="Bench" onClick={ () => this.toggleSpectator(user) } />
                    { this.state.order
                      ? <>
                          <IconButton className="vertical-align-middle"
                            icon={{ icon: 'north', size: 'xsmall' }}
                            onClick={ () => this.moveUser(user, true) }
                            disabled={ i === 0 }/>
                          <IconButton className="vertical-align-middle"
                            icon={{ icon: 'south', size: 'xsmall' }}
                            onClick={ () => this.moveUser(user, false) }
                            disabled={ i === players.length-1 }/>
                        </>
                      : null
                    }
                    { this.state.teams
                      ? //<Select theme={['secondary']} outlined enhanced label="Team" options={ teams } value={ ''+user.team } onChange={ e => this.setTeam(user, +e.target.value) } />
                        <TextField style={{ width: "100px" }} type="number" label="Team" min="0" value={ user.team ? ''+user.team : "" } onChange={ e => this.setTeam(user, +e.target.value) } />
                      : null
                    }
                  </l.ListItemMeta>
                </l.ListItem>
            )}
            { players.length === 0 ? "There are no players in this game." : null }
            <l.ListItem disabled>
              <h1>Spectators</h1>
            </l.ListItem>
            { spectators.map((user, i) =>
                <l.ListItem key={user.id} disabled>
                  <span className="unselectable">{+i + 1}.&nbsp;</span> {user.display}{user.id === this.props.user.id ? " (You)" : ""}
                  <l.ListItemMeta>
                    <span>
                    { user.id === this.props.user.id
                      ? <>&nbsp;<Button raised label="Make Player" onClick={ () => this.toggleSpectator(user) } /></>
                      : <>
                          <Button raised label="Kick out" onClick={ () => this.toggleAdmitted(user) } />
                          &nbsp;
                          <Button raised label="Make Player" onClick={ () => this.toggleSpectator(user) } />
                        </>
                    }
                    </span>
                  </l.ListItemMeta>
                </l.ListItem>
            )}
            { spectators.length === 0 ? "There are no spectators in this game." : null }
            <l.ListItem disabled>
              <h1>Waiting</h1>
            </l.ListItem>
            { waiting.filter(user => !user.admitted).map((user, i) =>
                <l.ListItem key={user.id} disabled>
                  <span className="unselectable">{+i + 1}.&nbsp;</span> {user.display}{user.id === this.props.user.id ? " (You)" : ""}
                  <l.ListItemMeta>
                    &nbsp;
                    <Button raised label="Admit" onClick={ () => this.toggleAdmitted(user) } />
                  </l.ListItemMeta>
                </l.ListItem>
            )}
            { waiting.filter(user => !user.admitted).length === 0 ? "There are no users waiting to join this game." : null }
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
          <h1>Game #{ this.props.game.id } - { this.props.game.style }</h1>
          <g.Grid fixedColumnWidth={ true }>
            <g.GridCell align="left" span={3} tablet={8} />
            <g.GridCell align="right" span={6} tablet={8}>
              { content }
            </g.GridCell>
            <g.GridCell align="right" desktop={12} tablet={8}>
              { userContent }
            </g.GridCell>
          </g.Grid>
        </div>
      );
    }

    return (
      <div>
        { countdown }
        <h1>Game #{ this.props.game.id } - { this.props.game.style }</h1>
        { content }
        <br/>
        { userContent }
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
      GameConfig: {},
    };
  }

  async componentDidMount() {
    let GameConfig = await GameModel.LoadConfig();

    var have_game = this.props.game !== undefined && this.props.game !== null && this.props.game.config !== undefined && this.props.game.config !== null;
    var game = have_game ? this.props.game : undefined;

    this.setState(state => Object.assign(state, { GameConfig }), () => {
      if (have_game && game.style !== null) {
        this.setState(state => Object.assign(state, this.createGameConfig(game.style)));
      }
    });
  }

  createGameConfig(new_style) {
    var have_game = this.props.game !== undefined && this.props.game !== null && this.props.game.config !== undefined && this.props.game.config !== null && this.props.game.style === new_style;
    var game = have_game ? this.props.game : undefined;
    var config = have_game ? game.config : undefined;
    var have_arg = new_style !== undefined && new_style !== null;
    var have_state = this.state !== undefined && this.state !== null && this.state.mode === null && this.state.mode !== undefined;

    if (!have_game && !have_arg && !have_state) {
      return null;
    }

    if (this.state?.initialize && this.state?.mode === new_style) {
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
    if (style && this.state.GameConfig[style]) {
      for (let option of this.state.GameConfig[style].options) {
        additional_state[option.name] = option.values.value(have_game ? config[option.name] : option.values.default);
      }
    } else {
      console.log("Unknown game style: " + style, game, this.state, this.props, this.state.GameConfig);
    }

    if (additional_state !== null) {
      return additional_state;
    }

    return {};
  }

  toObject() {
    var obj = {};
    for (let option of this.state.GameConfig[this.state.mode].options) {
      obj[option.name] = option.values.value(this.state[option.name]);
    }
    return obj;
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
      return this.newState(() => ({ [name]: v, ...this.createGameConfig(v) }));
    };
  }

  toggle(name) {
    this.newState(state => ({ [name]: !state[name] }));
  }

  setError(message) {
    this.setState(state => Object.assign({}, state, { error: message }));
  }

  renderTextField(option) {
    var props = {};
    if (option.values.type === 'int') {
      if (option.values.min !== undefined) {
        props['min'] = option.values.min;
      }
      if (option.values.max !== undefined) {
        props['max'] = option.values.max;
      }
      if (option.values.step !== undefined) {
        props['step'] = option.values.step;
      }
    }

    return (
      <l.ListItem disabled>
        <TextField fullwidth
          type={ option.values.type === 'int' ? 'number' : 'text' }
          label={ option.label }
          name={ option.name }
          value={ this.state[option.name] }
          onChange={ this.inputHandler(option.name) }
          disabled={ !this.state.editable }
          { ...props }
        />
      </l.ListItem>
    );
  }

  renderSwitch(option) {
    if (!option || option.values.type !== 'bool') {
      console.log(option);
      return null;
    }
    return (
      <l.ListItem
        onClick={ (e) => e.target === e.currentTarget && this.toggle(option.name) }
        disabled={ !this.state.editable }
      >
        <Switch
          label={ this.state[option.name] ? option.label.true : option.label.false }
          name={ option.name }
          checked={ this.state[option.name] }
          onChange={ () => this.toggle(option.name, true) }
          disabled={ !this.state.editable }
        />
      </l.ListItem>
    );
  }

  renderSelect(option) {
    return (
      <Select
        label={ option.label } enhanced
        value={ "" + this.state[option.name] }
        onChange={ this.inputHandler(option.name) }
        disabled={ !this.state.editable }
        options={ option.values.options }
      />
    );
  }

  renderField(option) {
    if (!option || !option.values || !option.values.type) {
      console.log("Bad option:", option);
      return null;
    }

    if (option.values.type === 'select' || option.values.type === 'enum') {
      return this.renderSelect(option);
    }

    if (option.values.type === 'bool') {
      return this.renderSwitch(option);
    }

    return this.renderTextField(option);
  }

  renderRush() {
    var pl = (num, name) => (""+num+" "+name+(+num === 1 ? "" : "s"));
    var cfg = this.state.GameConfig['rush'];
    if (!cfg) {
      return null;
    }

    return (
      <>
        <l.ListGroupSubheader>Rush Options</l.ListGroupSubheader>
        { this.renderField(cfg.options[0]) }
        { this.renderField(cfg.options[1]) }
        { this.renderField(cfg.options[2]) }
        {
          this.state.tiles_per_player
          ? <p>There will be { this.state.num_tiles } tiles per player</p>
          : <p>There will be { this.state.num_tiles } tiles overall</p>
        }
        <br />
        { this.renderField(cfg.options[3]) }
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
        { this.renderField(cfg.options[4]) }
        { this.renderField(cfg.options[5]) }
        { this.renderField(cfg.options[6]) }
        <p>Each player will start with { pl(this.state.start_size, "tile") }. Each draw will be { pl(this.state.draw_size, "tile") }, and players who discard a tile will need to draw { this.state.discard_penalty } back.</p>
        <br/>
      </>
    );
  }

  renderSpades() {
    var cfg = this.state.GameConfig.spades;
    if (!cfg) {
      return null;
    }

    return (
      <>
        <l.ListGroupSubheader>Game Options</l.ListGroupSubheader>
        { this.renderField(cfg.options[0]) }
        <l.ListGroupSubheader>
          Trick Options
        </l.ListGroupSubheader>
        { this.renderField(cfg.options[1]) }
        {
          this.state.overtakes
          ? this.renderField(cfg.options[2])
          : null
        }
        { this.renderField(cfg.options[3]) }
        { this.renderField(cfg.options[4]) }
        { this.renderField(cfg.options[5]) }
        <l.ListGroupSubheader>
          Nil Options
        </l.ListGroupSubheader>
        { this.renderField(cfg.options[6]) }
        { this.renderField(cfg.options[7]) }
        { this.renderField(cfg.options[8]) }
        { this.renderField(cfg.options[9]) }
        { this.renderField(cfg.options[10]) }
        <l.ListGroupSubheader>
          Scoring Options
        </l.ListGroupSubheader>
        { this.renderField(cfg.options[11]) }
        { this.renderField(cfg.options[12]) }
        { this.renderField(cfg.options[13]) }
        { this.renderField(cfg.options[14]) }
        { this.renderField(cfg.options[15]) }
      </>
    );
  }

  renderThreeThirteen() {
    var cfg = this.state.GameConfig['three thirteen'];
    if (!cfg) {
      return null;
    }

    return (
      <>
        <l.ListGroupSubheader>Game Options</l.ListGroupSubheader>
        { this.renderField(cfg.options[0]) }
        { this.renderField(cfg.options[1]) }
        { this.renderField(cfg.options[2]) }
        <l.ListGroupSubheader>Set (Grouping) Options</l.ListGroupSubheader>
        { this.renderField(cfg.options[3]) }
        { this.renderField(cfg.options[4]) }
        { this.renderField(cfg.options[5]) }
        { this.renderField(cfg.options[6]) }
        { this.renderField(cfg.options[7]) }
        <l.ListGroupSubheader>Laying Down Options</l.ListGroupSubheader>
        { this.renderField(cfg.options[8]) }
        { this.renderField(cfg.options[9]) }
        { this.renderField(cfg.options[10]) }
        <l.ListGroupSubheader>Scoring Options</l.ListGroupSubheader>
        { this.renderField(cfg.options[11]) }
        { this.renderField(cfg.options[12]) }
        { this.renderField(cfg.options[13]) }
      </>
    );
  }

  renderEightJacks() {
    var cfg = this.state.GameConfig['eight jacks'];
    if (!cfg) {
      return null;
    }

    return (
      <>
        <l.ListGroupSubheader>Game Options</l.ListGroupSubheader>
        { this.renderField(cfg.options[0]) }
        { this.renderField(cfg.options[1]) }
        { this.renderField(cfg.options[2]) }
        <l.ListGroupSubheader>Board Options</l.ListGroupSubheader>
        { this.renderField(cfg.options[3]) }
        { this.renderField(cfg.options[4]) }
        { this.renderField(cfg.options[5]) }
        { this.renderField(cfg.options[6]) }
        <l.ListGroupSubheader>Hand Options</l.ListGroupSubheader>
        { this.renderField(cfg.options[7]) }
        { this.renderField(cfg.options[8]) }
        <l.ListGroupSubheader>General Options</l.ListGroupSubheader>
        { this.renderField(cfg.options[9]) }
      </>
    );
  }

  renderHearts() {
    var cfg = this.state.GameConfig.hearts;
    if (!cfg) {
      return null;
    }

    return (
      <>
        <l.ListGroupSubheader>Game Options</l.ListGroupSubheader>
        { this.renderField(cfg.options[0]) }
        <l.ListGroupSubheader>Playing Options</l.ListGroupSubheader>
        { this.renderField(cfg.options[1]) }
        { this.renderField(cfg.options[2]) }
        { this.renderField(cfg.options[3]) }
        { this.renderField(cfg.options[4]) }
        { this.renderField(cfg.options[5]) }
        { this.renderField(cfg.options[6]) }
        <l.ListGroupSubheader>Scoring Options</l.ListGroupSubheader>
        { this.renderField(cfg.options[7]) }
        { this.renderField(cfg.options[8]) }
        { this.renderField(cfg.options[9]) }
        { this.renderField(cfg.options[10]) }
        { this.renderField(cfg.options[11]) }
        { this.renderField(cfg.options[12]) }
        { this.renderField(cfg.options[13]) }
        { this.renderField(cfg.options[14]) }
        { this.renderField(cfg.options[15]) }
      </>
    );
  }

  renderGin() {
    var cfg = this.state.GameConfig.gin;
    if (!cfg) {
      return null;
    }

    return (
      <>
        <l.ListGroupSubheader>Game Options</l.ListGroupSubheader>
        { this.renderField(cfg.options[0]) }
        <l.ListGroupSubheader>Playing Options</l.ListGroupSubheader>
        { this.renderField(cfg.options[1]) }
        { this.renderField(cfg.options[2]) }
        { this.renderField(cfg.options[3]) }
        { this.renderField(cfg.options[4]) }
        <l.ListGroupSubheader>Scoring Options</l.ListGroupSubheader>
        { this.renderField(cfg.options[5]) }
        { this.renderField(cfg.options[6]) }
        { this.renderField(cfg.options[7]) }
        { this.renderField(cfg.options[8]) }
        { this.renderField(cfg.options[9]) }
        { this.renderField(cfg.options[10]) }
      </>
    );
  }

  render() {
    var known_modes = [];
    for (let value of Object.keys(this.state.GameConfig)) {
      known_modes.push({
        'label': this.state.GameConfig[value].name,
        'value': value,
      });
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
    } else if (this.state.mode === 'gin') {
      config = this.renderGin();
    } else if (this.state.mode !== null) {
      console.log("Unknown game mode: " + this.state.mode, this.state);
    }

    return (
      <c.Card>
        <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
          {
            this.props.editable === false
            ? <Typography theme="error" use="body2">This configuration is not editable.</Typography>
            : null
          }
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
                <Select
                  label="Game Mode" enhanced
                  value={ this.state.mode }
                  onChange={ this.inputHandler("mode") }
                  disabled={ !this.state.editable }
                  options={ known_modes }
                />
                <br/>
                {
                  this.state.GameConfig[this.state.mode] && this.state.GameConfig[this.state.mode].description
                  ? <p> { this.state.GameConfig[this.state.mode].description } </p>
                  : null
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
      video_chat: '',
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
    room.config = {};
    room.config.video_chat = this.state.video_chat;

    await room.create();

    if (room.error !== null) {
      this.setError(room.error.message);
    } else {
      this.props.setRoom(room);
      this.props.setGame(null);
      this.props.setPage('room', '?code=' + room.code);
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
                <TextField fullwidth label="Video Chat Link" value={ this.state.video_chat } onChange={ this.inputHandler("video_chat") } />
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

    var try_game = this.state.code[0] === "g" && (this.state.code[1] === "c" || this.state.code[1] === "p") && (this.state.code[2] === '-' || this.state.code[2] === ' ');
    var try_room = this.state.code[0] === "r" && (this.state.code[1] === "c" || this.state.code[1] === "p") && (this.state.code[2] === '-' || this.state.code[2] === ' ');

    if (!try_game && !try_room) {
      try_game = true;
      try_room = true;
    }

    if (try_game) {
      var game = await GameModel.FromCode(this.props.user, this.state.code);
      if (game.error === undefined || game.error === null) {
        let page = '/play';
        if (game.lifecycle === 'playing') {
          game = loadGame(game);
          page = '/playing';
        } else if (game.lifecycle === 'finished') {
          game = loadGame(game);
          page = '/afterpraty';
        }
        this.props.setPage(page, '?code=' + game.code);
        this.props.setGame(game);
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
        let page = '/room/games';
        if (!room.admitted) {
          page = '/room/members';
        }
        this.props.setRoom(room);
        this.props.setPage(page, '?code=' + room.code);
        return;
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
      this.props.setPage('play', true);
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
                  <Button raised label="Host a Room" onClick={ () => this.props.setPage('/create/room', false) } />
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
                  <Button raised label="Host a Game" onClick={ () => this.props.setPage('/create/game', false) } />
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
                  <l.ListItem disabled><TextField fullwidth placeholder="Secret Passcode" name="code" value={ this.state.code } onChange={ this.inputHandler("code") } /></l.ListItem>
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
