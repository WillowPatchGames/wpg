// Library imports
import React from 'react';

import {
  Link,
} from "react-router-dom";

import { Button } from '@rmwc/button';
import '@rmwc/button/styles';
import { Icon } from '@rmwc/icon';
import '@rmwc/icon/styles';
import { IconButton } from '@rmwc/icon-button';
import '@rmwc/icon-button/styles';
import * as c from '@rmwc/card';
import '@rmwc/card/styles';
import * as g from '@rmwc/grid';
import '@rmwc/grid/styles';
import * as l from '@rmwc/list';
import '@rmwc/list/styles';
import { Switch } from '@rmwc/switch';
import '@rmwc/switch/styles';
import { TextField } from '@rmwc/textfield';
import '@rmwc/textfield/styles';

// Application imports
import '../../../App.css';
import { loadGame, addEv, notify } from '../common.js';
import { CreateGameForm } from '../config.js';
import { UserCache } from '../../../utils/cache.js';
import { CancellableButton } from '../../../utils/cancellable.js';

class PreGameAdminPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      waitlist: [Object.assign({}, this.props.user, { admitted: true, playing: false, connected: false, ready: false, team: null })],
      started: false,
      countdown: null,
      order: true,
      teams: true,
      bind_requests: [],
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
            if (data.ready !== undefined && data.ready !== null) {
              Object.assign(player, { ready: data.ready });
            }
            if (data.bound_players !== undefined) {
              Object.assign(player, { bound_players: data.bound_players });
            }
            missing = false;
          }
        }

        if (missing) {
          var admitted = data.admitted ? true : false;
          var playing = data.playing ? true : false;
          var connected = data.connected ? true : false;
          var ready = data.ready ? true : false;
          this.state.waitlist.push(Object.assign(user, { admitted, playing, connected, ready }));
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
        this.game.interface.controller.wsController.send({'message_type': 'countback', 'value': data.value});
      },
      "finished": async (data) => {
        data.message = await personalize(data.winner) + " won!";
        notify(this.props.snackbar, data.message, data.type);
        this.game.winner = data.winner;
        let page = this.props.room ? "/room/game/" + this.props.game.id : "/game";
        this.props.setPage(page, true);
      },
      "notify-bind": async(data) => {
        let bind_requests = [data.initiator_id];
        for (let existing_request of this.state.bind_requests) {
          bind_requests.push(existing_request);
        }

        this.setState(state => Object.assign({}, state, { bind_requests }));
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
  async bindToSpectator(spectator) {
    let id = spectator?.id || spectator?.user_id;
    let response = await this.game.interface.controller.bindToSpectator(id);
    if (response) {
      notify(this.props.snackbar, response.message, response.type);
    }
  }
  async acceptBindToPlayer(player) {
    let id = player?.id || player?.user_id;
    let response = await this.game.interface.controller.acceptBind(id);
    if (!response) {
      let bind_requests = [];
      for (let remaining_request of this.state.bind_requests) {
        if (remaining_request !== id) {
          bind_requests.push(remaining_request);
        }
      }

      this.setState(state => Object.assign({}, state, { bind_requests }));
    } else {
      notify(this.props.snackbar, response.message, response.type);
    }
  }
  async unbindPeer(player) {
    let id = player?.id || player?.user_id;
    let response = await this.game.interface.controller.unbindPeer(id);
    if (response) {
      notify(this.props.snackbar, response.message, response.type);
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
    if (this.state.started) {
      await this.game.interface.controller.cancelGame();
      this.setState(state => Object.assign({}, state, { started: false }));
    }

    for (let player of this.state.waitlist) {
      player.connected = false;
    }
    this.sortUsers();

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

    let us = null;
    if (players !== null) {
      for (let player_id of Object.keys(players).sort()) {
        let player = players[player_id];
        if (+player.id === +this.props.user.id) {
          us = player;
        }
      }
    }

    if (spectators !== null) {
      for (let player_id of Object.keys(spectators).sort()) {
        let player = spectators[player_id];
        if (+player.id === +this.props.user.id) {
          us = player;
        }
      }
    }

    let userContent = <c.Card>
      <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
        <l.List twoLine>
          <l.ListGroup>
            <l.ListItem disabled>
              <h1>Players</h1>
              &nbsp;&nbsp;
              <Switch checked={ this.state.order } label={ this.state.order ? "Order manually" : "Order automatically" } onChange={ () => this.setState(state => Object.assign(state, { order: !state.order })) } />
              &nbsp;&nbsp;
              {/*<Switch checked={ this.state.teams } label="Put into teams" onChange={ () => this.setState(state => Object.assign(state, { teams: !state.teams })) } />*/}
            </l.ListItem>
            { players.map((user, i) =>
                <l.ListItem key={user.id} disabled style={{ height: "auto", minHeight: "72px" }}>
                  <span className="unselectable">{+i + 1}.&nbsp;</span> {user.display}{user.id === this.props.user.id ? " (You)" : user.ready ? <>&nbsp;-&nbsp;<i style={{ 'verticalAlign': 'middle' }}>Ready</i></> : <>&nbsp;-&nbsp;<i style={{ 'verticalAlign': 'middle' }}>Not Ready</i></> }
                  {
                    this.state.started
                    ? <Icon icon={ user.connected ? 'check' : 'hourglass_empty' } style={{ 'verticalAlign': 'middle' }} />
                    : <></>
                  }
                  <l.ListItemMeta>
                    {
                      user !== us && this.state.bind_requests.includes(user?.id || user?.user_id)
                      ?
                        <>
                          <Button label="Accept Bind" raised onClick={ () => this.acceptBindToPlayer(user) } />&nbsp;
                        </>
                      : <></>
                    }
                    {
                      user !== us && us?.bound_players?.includes(user?.id || user?.user_id)
                      ?
                        <>
                          <Button label="Unbind" raised onClick={ () => this.unbindPeer(user) } />&nbsp;
                        </>
                      : <></>
                    }
                    { user.id === this.props.user.id
                      ? null
                      : <>
                          <Button raised label="Kick out" onClick={ () => this.toggleAdmitted(user) } />
                          &nbsp;
                        </>
                    }
                    <Button raised label="Bench" onClick={ () => this.toggleSpectator(user) } />
                    { this.state.order
                      ? <span style={{ 'whiteSpace': 'nowrap' }}>
                          <IconButton className="vertical-align-middle"
                            icon={{ icon: 'north', size: 'xsmall' }}
                            onClick={ () => this.moveUser(user, true) }
                            disabled={ i === 0 }/>
                          <IconButton className="vertical-align-middle"
                            icon={{ icon: 'south', size: 'xsmall' }}
                            onClick={ () => this.moveUser(user, false) }
                            disabled={ i === players.length-1 }/>
                        </span>
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
                <l.ListItem key={user.id} disabled style={{ height: "auto", minHeight: "48px" }}>
                  <span className="unselectable">{+i + 1}.&nbsp;</span> {user.display}{user.id === this.props.user.id ? " (You)" : ""}
                  <l.ListItemMeta>
                    {
                      user !== us
                      ?
                        !us?.bound_players?.includes(user?.id || user?.user_id)
                        ?
                          <><CancellableButton label="Bind" loadingLabel="Binding..." raised submitHandler={ () => this.bindToSpectator(user) } cancelHandler={ () => this.unbindPeer(user) } />&nbsp;</>
                        :
                          <><Button label="Unbind" raised onClick={ () => this.unbindPeer(user) } />&nbsp;</>
                      : <></>
                    }
                    {
                      user !== us && this.state.bind_requests.includes(user?.id || user?.user_id)
                      ?
                        <>
                          <Button label="Accept Bind" raised onClick={ () => this.acceptBindToPlayer(user) } />&nbsp;
                        </>
                      : <></>
                    }
                    { user.id === this.props.user.id
                      ? <>&nbsp;<Button raised label="Make Player" onClick={ () => this.toggleSpectator(user) } /></>
                      : <>
                          <Button raised label="Kick out" onClick={ () => this.toggleAdmitted(user) } />
                          &nbsp;
                          <Button raised label="Make Player" onClick={ () => this.toggleSpectator(user) } />
                        </>
                    }
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

export { PreGameAdminPage };
