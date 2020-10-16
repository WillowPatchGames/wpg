// Library imports
import React from 'react';

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

import { Avatar } from '@rmwc/avatar';
import { Button } from '@rmwc/button';
import { Checkbox } from '@rmwc/checkbox';
import * as c from '@rmwc/card';
import * as d from '@rmwc/dialog';
import * as g from '@rmwc/grid';
import * as l from '@rmwc/list';
import { Select } from '@rmwc/select';
import { Switch } from '@rmwc/switch';
import { Typography } from '@rmwc/typography';
import { TextField } from '@rmwc/textfield';

// Application imports
import '../App.css';
import { UserModel, RoomModel, GameModel, normalizeCode } from '../models.js';
import { LoginForm } from './login.js';
import { Game } from '../component.js';
import { RushGame, RushData } from '../games/rush.js';
import { UserCache, GameCache } from '../utils/cache.js';
import { gravatarify } from '../utils/gravatar.js';

function loadGame(game) {
  if (!game || !game.endpoint) return null;

  if (!game.interface) {
    // XXX: Update to support multiple game types.
    game.interface = new RushGame(game);
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

class RushGameSynopsis extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      players: null,
      remaining: null,
    }

    this.game = loadGame(this.props.game);
    this.props.setGame(this.game);

    if (this.game) {
      this.state.interface = this.game.interface;
      this.unmount = addEv(this.game, {
        "synopsis": async (data) => {
          if (data && data.players && data.remaining !== undefined) {
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

            this.setState(state => Object.assign({}, state, { players, remaining: data.remaining }));
          }
        },
      });
    }
  }

  componentWillUnmount() {
    if (this.unmount) this.unmount();
  }

  render() {
    var player_view = [];
    if (this.state.remaining !== null) {
      player_view.push(
        <div className="playerSummary">
          <span className="playerSummaryInHand" title="Tiles in Pool">{ this.state.remaining }&nbsp;in&nbsp;pool</span>
        </div>
      );
    }

    if (this.state.players) {
      if (this.state.players[this.props.user.id]) {
        var us = this.state.players[this.props.user.id];
        player_view.push(
          <div className="playerSummary">
            <Avatar src={ gravatarify(us.user) } name="You" size="xlarge" />
            {
              us.playing
              ?
                <span className="playerSummaryInfo">
                  <span className="playerSummaryInHand" title="Tiles in Hand">{ us.in_hand }&nbsp;in&nbsp;hand</span>
                </span>
              :
                <span className="playerSummaryInfo">Spectator</span>
            }
          </div>
        );
      }

      for (let player_id of Object.keys(this.state.players).sort()) {
        if (+player_id === this.props.user.id) {
          continue;
        }

        let them = this.state.players[player_id];
        player_view.push(
          <div className="playerSummary">
            <Avatar src={ gravatarify(them.user) } name={ them.user.display } size="xlarge" />
            {
              them.playing
              ?
                <span className="playerSummaryInfo">
                  <span className="playerSummaryInHand" title="Tiles in Hand">{ them.in_hand }&nbsp;in&nbsp;hand</span>
                </span>
              :
                <span className="playerSummaryInfo">Spectator</span>
            }
          </div>
        );
      }
    }

    return (
      <div style={{ width: "80%" , margin: "0 auto 0.5em auto" }}>
        <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
          <div className="text-left scrollable-x">
            <b>Rush!</b>
            { player_view }
          </div>
        </c.Card>
      </div>
    );
  }
}

class RushGamePage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};

    this.game = loadGame(this.props.game);
    this.props.setGame(this.game);

    let personalize = async (usr) => usr === this.props.user.id ? "You" : (await UserCache.FromId(usr)).display;
    if (this.game) {
      this.state.interface = this.game.interface;
      this.unmount = addEv(this.game, {
        "started": data => {
          data.message = "Let the games begin!";
          notify(this.props.snackbar, data.message, data.type);

          if (!data.playing) {
            this.props.setPage('afterparty');
          }
        },
        "countdown": data => {
          data.message = "Game starting in " + data.value;
          notify(this.props.snackbar, data.message, data.type);
          this.state.interface.controller.wsController.send({'message_type': 'countback', 'value': data.value});
        },
        "draw": async (data) => {
          data.message = await personalize(data.drawer) + " drew!";
          notify(this.props.snackbar, data.message, data.type);
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
  }
  componentWillUnmount() {
    if (this.unmount) this.unmount();
  }
  render() {
    return (
      <div>
        <RushGameSynopsis {...this.props} />
        <Game interface={ this.state.interface } notify={ (...arg) => notify(this.props.snackbar, ...arg) } />
      </div>
    );
  }
}
RushGamePage.immersive = true;

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
    this.game = loadGame(this.props.game);
    this.state = {
      snapshots: null,
      winner: this.game.winner,
      finished: false,
      message: "Loading results...",
      timeout: killable(() => { this.refreshData() }, 5000),
    };

    GameCache.Invalidate(this.props.game.id);

    this.unmount = addEv(this.game, {
      "game-state": async (data) => {
        var winner = null;
        if (data.winner && data.winner !== 0) {
          winner = await UserCache.FromId(data.winner);
        }

        var snapshots = [];
        for (let snapshot_index in data.player_data) {
          let snapshot_data = data.player_data[snapshot_index];
          let snapshot = {};
          snapshot.user = await UserCache.FromId(data.player_map[snapshot_index]);
          snapshot.interface = new RushGame(this.game, true);
          snapshot.interface.data = RushData.deserialize(snapshot_data);
          snapshot.interface.data.grid.padding(0);
          snapshot.interface.data.check({ unwords: snapshot_data.unwords });
          snapshots.push(snapshot);
        }

        if (!data.winner) {
          data.winner = 0;
        }

        snapshots.sort((a,b) => (
          (-(a.user.display === data.winner.display) - - (b.user.display === data.winner.display)) ||
          (a.interface.data.bank.length - b.interface.data.bank.length) ||
          (a.interface.data.grid.components().length - b.interface.data.grid.components().length) ||
          (a.interface.data.unwords.length - b.interface.data.unwords.length)
        ));

        // HACK: When refreshData() is called from the button, we don't redraw
        // the screen even though new data is sent. Use snapshots to send only
        // the data we care about.
        this.setState(state => Object.assign({}, state, { snapshots: [] }));
        this.setState(state => Object.assign({}, state, { snapshots: snapshots, winner: winner, finished: data.finished }));

        if (data.finished) {
          if (this.state.timeout) {
            this.state.timeout.kill();
          }

          this.setState(state => Object.assign({}, state, { timeout: null }));
        }
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
  refreshData() {
    this.game.interface.controller.wsController.send({"message_type": "peek"});
  }
  returnToRoom() {
    this.props.setGame(null);
    this.props.setPage("room");
  }
  render() {
    return (
      <>
        <RushGameSynopsis {...this.props} />
        <div>
          { this.state.finished && this.state.winner
          ? <h1>{ this.state.winner.id === this.props.user.id ? "You" : this.state.winner.display } won!</h1>
          : <h1>Please wait while the game finishes...</h1>
          }
          { this.state.finished
            ? <h2>That was fun, wasn't it?</h2>
            : <></>
          }
          {
            this.props.room ? <Button onClick={ () => this.returnToRoom() } raised >Return to Room</Button> : <></>
          }
          {
            !this.state.finished ? <span className="leftpad"><Button onClick={ () => this.state.timeout.exec() } raised >Look again!</Button></span> : <></>
          }
          <ol className="results">
            { this.state.snapshots
            ? this.state.snapshots.map(snapshot =>
                <li key={ snapshot.user.display }>
                  <h1>{ snapshot.user.display }</h1>
                  <Game interface={ snapshot.interface } readOnly={ true } />
                </li>
              )
            : <p>{ this.state.message }</p>
            }
          </ol>
        </div>
      </>
    );
  }
}

class PreGameUserPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      status: "pending",
      players: null,
    }

    this.game = this.props.game || {};
    this.props.setGame(loadGame(this.game));

    let personalize = async (usr) => usr === this.props.user.id ? "You" : (await UserCache.FromId(usr)).display;
    this.unmount = addEv(this.game, {
      "admitted": data => {
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
          this.props.setPage('playing');
        } else {
          this.props.setPage('afterparty');
        }
      },
      "countdown": data => {
        data.message = "Game starting in " + data.value;
        notify(this.props.snackbar, data.message, data.type);
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
      </div>
    </c.Card>;

    if (this.props.room === null) {
      return (
        <div>
          <h1>Game #{ this.props.game.id }</h1>
          <g.Grid fixedColumnWidth={ true }>
            <g.GridCell align="left" span={3} />
            <g.GridCell align="right" span={6}>
              { content }
            </g.GridCell>
          </g.Grid>
        </div>
      );
    }

    return (
      <div>
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
      waitlist: [Object.assign(this.props.user, { admitted: true, playing: false })],
    };

    this.game = this.props.game || {};
    this.props.setGame(loadGame(this.game));

    let personalize = async (usr) => usr === this.props.user.id ? "You" : (await UserCache.FromId(usr)).display;
    this.unmount = addEv(this.game, {
      "notify-join": data => {
        var userPromise = UserCache.FromId(data.joined);
        userPromise.then((user) => {
          var missing = true;
          for (let player of this.state.waitlist) {
            if (player.id === data.joined) {
              Object.assign(player, user);
              missing = false;
            }
          }

          if (missing) {
            this.state.waitlist.push(Object.assign(user, { admitted: data.admitted, playing: data.playing }));
          }

          this.setState(state => state);
        });
      },
      "started": data => {
        data.message = "Let the games begin!";
        notify(this.props.snackbar, data.message, data.type);
        if (data.playing) {
          this.props.setPage('playing');
        } else {
          this.props.setPage('afterparty');
        }
      },
      "countdown": data => {
        data.message = "Game starting in " + data.value;
        notify(this.props.snackbar, data.message, data.type);
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
    var ret = await this.game.interface.controller.startGame();
    if (ret && ret.message_type && ret.message_type === "error") {
      notify(this.props.snackbar, ret.error, "error");
      return;
    }

    this.props.setPage('playing');
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
          <p><a ref={ this.link_ref } href={ window.location.origin + "/?code=" + this.game.code + "#play" } onClick={ (e) => { e.preventDefault(); } }>{ window.location.origin + "/?code=" + this.game.code + "#play" }</a></p>
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
                </l.ListItemMeta>
                </l.ListItem>
            )}
          </l.ListGroup>
        </l.List>
        <Button onClick={ () => this.start() } label="Start" raised />
      </div>
    </c.Card>;

    if (this.props.room === null) {
      return (
        <div>
          <h1>Game #{ this.props.game.id }</h1>
          <g.Grid fixedColumnWidth={ true }>
            <g.GridCell align="left" span={3} />
            <g.GridCell align="right" span={6}>
              { content }
            </g.GridCell>
          </g.Grid>
        </div>
      );
    }

    return (
      <div>
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
    var config = have_game ? game.config : undefined;
    var editable = this.props.editable === undefined || this.props.editable;

    console.log(have_game, game, config);

    this.state = {
      editable: editable,
      error: null,
      mode: have_game ? game.style : 'rush',
      open: have_game ? game.open : true,
      spectators: have_game && game.spectator !== undefined ? game.spectator : true,
      num_players: have_game ? config.num_players : 4,
      num_tiles: have_game ? config.num_tiles : 75,
      tiles_per_player: have_game ? config.tiles_per_player : false,
      start_size: have_game ? config.start_size : 12,
      draw_size: have_game ? config.draw_size : 1,
      discard_penalty: have_game ? config.discard_penalty : 3,
      frequency: have_game ? config.frequency : 1,
    }

    console.log(this.state);
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
    game.num_players = +this.state.num_players;
    game.num_tiles = +this.state.num_tiles;
    game.tiles_per_player = this.state.tiles_per_player;
    game.start_size = +this.state.start_size;
    game.draw_size = +this.state.draw_size;
    game.discard_penalty = +this.state.discard_penalty;
    game.frequency = +this.state.frequency;

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
        this.props.setPage('play');
        this.props.setCode(game.code);
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
    var pl = (num, name) => (""+num+" "+name+(+num === 1 ? "" : "s"));

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
                <l.ListItem disabled>
                  <TextField fullwidth type="number" label="Number of players" name="num_players" value={ this.state.num_players } onChange={ this.inputHandler("num_players") } min="2" max="15" step="1" disabled={ !this.state.editable } />
                </l.ListItem>
              </l.ListGroup>
              <br />
              <br />
              <l.ListGroup>
                <l.ListGroupSubheader>Game Options</l.ListGroupSubheader>
                <Select label="Game Mode" enhanced value={ this.state.mode } onChange={ this.inputHandler("mode") }  disabled={ !this.state.editable } options={
                  [
                    {
                      label: 'Rush (Fast-Paced Game)',
                      value: 'rush',
                    }
                  ]
                } />
                <br/>
                {
                  this.state.mode === 'rush' ?
                  <p>In rush mode, when one player draws a tile, all players must draw tiles and catch up – first to finish their board when there are no more tiles left wins!</p>
                  : <></>
                }
                <l.ListItem disabled>
                  <TextField fullwidth type="number" label="Number of tiles" name="num_tiles" value={ this.state.num_tiles } onChange={ this.inputHandler("num_tiles") } min="10" max="200" step="1" disabled={ !this.state.editable } />
                </l.ListItem>
                <l.ListItem onClick={(e) => e.target === e.currentTarget && this.toggle("tiles_per_player") } disabled={ !this.state.editable }>
                  <Switch label={ this.state.tiles_per_player ? "Tiles per player" : "Total number of tiles" } name="tiles_per_player" checked={ this.state.tiles_per_player } onChange={ () => this.toggle("tiles_per_player", true) } disabled={ !this.state.editable } />
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
              </l.ListGroup>
            </l.List>
            { this.state.editable ? <Button label="Create" raised disabled={ !this.state.editable } /> : <></> }
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
          <g.GridCell align="left" span={3} />
          <g.GridCell align="middle" span={6}>
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
          <g.GridCell align="left" span={3} />
          <g.GridCell align="middle" span={6}>
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
        this.props.setCode(game.code);
        this.props.setGame(game);
        this.props.setPage('play');
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
        this.props.setCode(room.code);
        this.props.setRoom(room);
        this.props.setPage('room');
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
          <div style={{ padding: '1rem 0px 1rem 0px' }}>
            <c.Card>
              <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
                <div>
                  <Typography use="headline3">Host a Room</Typography>
                  <p>
                    <a href="#create-room">Looking to make a new room? Create one here!</a>.<br />
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
          <div style={{ padding: '1rem 0px 1rem 0px' }}>
            <c.Card>
              <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
                <div>
                  <Typography use="headline3">Host a Single Game</Typography>
                  <p>
                    <a href="#create-game">Looking to play a single game with some friends? Make one here!</a>
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
                  In order to create rooms and games, <a href="#pricing">purchase
                  a plan</a> first.
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
                own games, <a href="#profile">upgrade your account</a> to a
                full account.
              </p>
            </div>
          </div>
        </c.Card>
      </div>;
    }

    let inner = <g.GridRow>
      <g.GridCell align="left" span={6}>
        <c.Card>
          <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
            <div>
              <Typography use="headline3">Join an Existing Room or Game</Typography>
              <p>
                Good luck, and may the odds be ever in your favor!<br /><br />
                Need a refresher on <a href="#rush-rules">the rules</a> or want
                to check out <a href="#docs">the documentation</a>?
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
      <g.GridCell align="right" span={6}>
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
            <g.GridCell align="left" span={3} />
            <g.GridCell align="middle" span={6}>
              <c.Card>
                <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
                  <Typography use="headline3">Join as Guest</Typography>
                  <p>
                    Since you're not <a href="#login">logged in</a>, how about
                    playing as a guest for now? You can always upgrade your
                    account later.
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
  killable,
  AfterPartyPage,
  CreateGamePage,
  CreateGameForm,
  CreateRoomPage,
  JoinGamePage,
  PreGamePage,
  RushGamePage,
};
