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
import { Game } from '../component.js';
import { SpadesGame } from '../games/spades.js';
import { SpadesGameComponent } from './games/spades.js';
import { RushGame, RushData } from '../games/rush.js';
import { UserCache, GameCache } from '../utils/cache.js';
import { gravatarify } from '../utils/gravatar.js';
import { Lazy } from '../utils/lazy.js';

function loadGame(game) {
  if (!game || !game.endpoint) return null;

  if (!game.interface) {
    // XXX: Update to support multiple game types.
    var mode = game.mode || game.style;
    if (mode === "rush") {
      game.interface = new RushGame(game);
    } else if (mode === "spades") {
      game.interface = new SpadesGame(game);
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
        <div key="tiles-pool" className="playerSummary">
          <span className="playerSummaryInHand" title="Tiles in Pool">{ this.state.remaining }&nbsp;in&nbsp;pool</span>
        </div>
      );
    }

    if (this.state.players) {
      if (this.state.players[this.props.user.id]) {
        var us = this.state.players[this.props.user.id];
        player_view.push(
          <div key="you-player" className="playerSummary">
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

      var representative = null;
      var spectators = 0;
      for (let player_id of Object.keys(this.state.players).sort()) {
        if (+player_id === this.props.user.id) {
          continue;
        }

        let them = this.state.players[player_id];
        if (!them.playing) {
          spectators += 1;
          representative = them;
          continue;
        }

        player_view.push(
          <div key={ "player"+player_id } className="playerSummary">
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

      if (spectators === 1) {
        player_view.push(
          <div key="spectator" className="playerSummary">
            <Avatar src={ gravatarify(representative.user) } name={ representative.user.display } size="xlarge" />
            <span className="playerSummaryInfo">Spectator</span>
          </div>
        );
      } else if (spectators > 1) {
        player_view.push(
          <div key="spectators" className="playerSummary">
            <AvatarGroup dense>
              <Avatar src={ gravatarify(representative.user) } name={ representative.user.display } size="xlarge" />
              <AvatarCount size="xlarge" overflow value={ spectators - 1 } />
            </AvatarGroup>
            <span className="playerSummaryInfo">Spectators</span>
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
    let new_state = { players: {} };

    if (this.props.game.interface.synopsis && this.props.game.interface.synopsis.players) {
      for (let player of this.props.game.interface.synopsis.players) {
        new_state.players[player.user.id] = player;
      }
    }

    return new_state;
  }

  render() {
    var synopsis_columns = {
      "user":{
        name: "User",
        printer: user => <Avatar src={ gravatarify(user) } name={ user.display } size="xlarge" />,
      },
      "is_turn":{
        name: "Turn",
        printer: a => a ? "•" : "",
      },
      "is_leader":{
        name: "Leading",
        printer: a => a ? "•" : "",
      },
      "is_dealer":{
        name: "Dealing",
        printer: a => a ? "•" : "",
      },
      "bid":"Bid",
      "tricks":"Tricks taken",
      "score":"Score",
      "overtakes":"Overtakes",
    };

    var tabulate = columns => data => {
      if (!data) return [null];
      var rows = [[]];
      for (let dat of data) {
        rows.push([]);
        for (let k in columns) {
          var printer = a => a;
          if (typeof columns[k] === "object") var printer = columns[k].printer;
          rows[rows.length-1].push(<td key={ k }>{ printer(dat[k]) }</td>)
        }
      }
      return rows.map((row,i) => <tr key={ i }>{row}</tr>);
    };

    var headings = [];
    for (let k in synopsis_columns) {
      var name = synopsis_columns[k];
      if (typeof name === "object") name = name.name;
      headings.push(<th key={ k }>{ name }</th>);
    }

    var player_rows = [];
    if (this.state.players) {
      var our_player = null;
      var remaining = [];

      for (let player_id of Object.keys(this.state.players).sort()) {
        let player = this.state.players[player_id];
        if (+player_id === +this.props.user.id) {
          our_player = player;
        } else {
          remaining.push(player);
        }
      }

      if (our_player) {
        player_rows.push(...tabulate(synopsis_columns)([ our_player ]));
      }

      if (remaining) {
        player_rows.push(...tabulate(synopsis_columns)(remaining));
      }

      console.log("synopsis -> render", our_player, remaining, player_rows);
    }

    var player_view = null;
    if (player_rows) {
      player_view = <table>
        <tbody>
          <tr key={ "spades_synopsis_headings" }>
            { headings }
          </tr>
          { player_rows }
        </tbody>
      </table>
    }

    return (
      <div style={{ width: "80%" , margin: "0 auto 0.5em auto" }}>
        <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
          <div className="text-left scrollable-x">
            <b>Spades</b>
            { player_view }
          </div>
        </c.Card>
      </div>
    );
  }
}

class SpadesGamePage extends React.Component {
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
          data.message = "Let the games begin!";
          notify(this.props.snackbar, data.message, data.type);

          if (!data.playing) {
            this.props.setPage('afterparty');
          }
        },
        "countdown": data => {
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
          data.message = await personalize(data.winner) + " won!";
          notify(this.props.snackbar, data.message, data.type);
          this.game.winner = data.winner;
          this.props.setPage('afterparty');
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

    return (
      <div>
        { countdown }
        <SpadesGameSynopsis game={ this.game } {...this.props} />
        <SpadesGameComponent game={ this.game } interface={ this.state.interface } notify={ (...arg) => notify(this.props.snackbar, ...arg) } />
      </div>
    );
  }
}

class RushGamePage extends React.Component {
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
          data.message = "Let the games begin!";
          notify(this.props.snackbar, data.message, data.type);

          if (!data.playing) {
            this.props.setPage('afterparty');
          }
        },
        "countdown": data => {
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
  componentDidMount() {
    this.props.setImmersive(true);
  }
  componentWillUnmount() {
    if (this.unmount) this.unmount();
    this.props.setImmersive(false);
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

    return (
      <div>
        { countdown }
        <RushGameSynopsis {...this.props} />
        <Game interface={ this.state.interface } notify={ (...arg) => notify(this.props.snackbar, ...arg) } />
      </div>
    );
  }
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
    if (this.props.game.interface) {
      this.props.game.interface.close();
    }

    this.props.game.interface = null;

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
          this.props.setPage('playing');
        } else {
          this.props.setPage('afterparty');
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
          this.props.setPage('playing');
        } else {
          this.props.setPage('afterparty');
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

    var additional_state = null;
    var style = have_arg
                ? new_style
                : (
                  have_state ? this.state.mode : game.style
                );
    if (style === 'rush') {
      additional_state = {
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
    } else {
      console.log("Unknown game style: " + style, game, this.state, this.props);
    }

    if (additional_state !== null) {
      this.setState(state => Object.assign({}, state, additional_state));
      return additional_state;
    }

    return {};
  }

  toObject() {
    if (this.state.mode === 'rush') {
      return this.rushToObject();
    } else if (this.state.mode === 'spades') {
      return this.spadesToObject();
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
    console.log(this.state);
    Object.assign(game, this.toObject());

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
