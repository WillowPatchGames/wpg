import React from 'react';

import '../App.css';
import '@rmwc/icon/styles';
import '@rmwc/button/styles';
import '@rmwc/card/styles';
import '@rmwc/checkbox/styles';
import '@rmwc/dialog/styles';
import '@rmwc/grid/styles';
import '@rmwc/list/styles';
import '@rmwc/select/styles';
import '@rmwc/switch/styles';
import '@rmwc/typography/styles';
import '@rmwc/textfield/styles';

import { Button } from '@rmwc/button';
import * as c from '@rmwc/card';
import * as d from '@rmwc/dialog';
import * as g from '@rmwc/grid';
import * as l from '@rmwc/list';
import { Select } from '@rmwc/select';
import { Switch } from '@rmwc/switch';
import { Checkbox } from '@rmwc/checkbox';
import { Typography } from '@rmwc/typography';
import { TextField } from '@rmwc/textfield';

// Application imports
import { UserModel, RoomModel, GameModel, normalizeCode } from '../models.js';
import { Game } from '../component.js';
import { RushGame, RushData } from '../games/rush.js';

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

class RushGamePage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.game = loadGame(this.props.game);
    this.props.setGame(this.game);

    let userify = usr => usr === this.props.user.id ? "You" : "Someone ";
    if (this.game) {
      this.state.interface = this.game.interface;
      this.unmount = addEv(this.game, {
        "started": data => {
          data.message = "Let the games begin!";
          notify(this.props.snackbar, data.message, data.type);
        },
        "countdown": data => {
          data.message = "Game starting in " + data.value;
          notify(this.props.snackbar, data.message, data.type);
          this.state.interface.controller.wsController.send({'message_type': 'countback', 'value': data.value});
        },
        "draw": data => {
          console.log("draw", data);
          data.message = userify(data.drawer) + " drew!";
          notify(this.props.snackbar, data.message, data.type);
        },
        "finished": data => {
          data.message = userify(data.user) + " won!";
          notify(this.props.snackbar, data.message, data.type);
          this.game.winner = data.user;
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
        <h1>Rush! game</h1>
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
    };

    this.unmount = addEv(this.game, {
      "game-state": async (data) => {
        var snapshots = [];
        for (let snapshot_index in data.player_data) {
          let snapshot_data = data.player_data[snapshot_index];
          let snapshot = {};
          snapshot.user = await UserModel.FromId(data.player_map[snapshot_index]);
          snapshot.interface = new RushGame(this.game, true);
          snapshot.interface.data = RushData.deserialize(snapshot_data);
          snapshot.interface.data.grid.padding(0);
          snapshot.interface.data.check({ unwords: snapshot_data.unwords });
          snapshots.push(snapshot);
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
        this.setState(state => Object.assign({}, state, { snapshots: snapshots, winner: data.winner, finished: data.finished }));
      },
      "": data => {
        if (data.message) {
          notify(this.props.snackbar, data.message, data.type);
        }
      },
    });
  }
  componentDidMount() {
    this.refreshData();
  }
  componentWillUnmount() {
    this.props.setGame(null);
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
    console.log("Rerender called?", this.state.snapshots);
    return (
      <div>
        { this.state.winner
        ? <h1>{ this.state.winner.id === this.props.user.id ? "You" : this.state.winner.display } won!</h1>
        : <></>
        }
        <h2>That was fun, wasn't it?</h2>
        {
          this.props.room ? <Button onClick={ () => this.returnToRoom() } raised >Return to Room</Button> : <></>
        }
        {
          !this.state.finished ? <Button onClick={ () => this.refreshData() } raised >Look again!</Button> : <></>
        }
        <ol className="results">
          { this.state.snapshots
          ? this.state.snapshots.map(snapshot =>
              <li key={ snapshot.user.display }>
                <h1>{ snapshot.user.display }</h1>
                <Game interface={ snapshot.interface } readOnly={ true } />
              </li>
            )
          : <p>Loading results …</p>
          }
        </ol>
      </div>
    );
  }
}

class PreGameUserPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      status: "pending",
    }
    this.game = this.props.game || {};
    this.props.setGame(loadGame(this.game));

    let userify = usr => usr === this.props.user.id ? "You" : "Someone ";
    this.unmount = addEv(this.game, {
      "admitted": data => {
        this.setState(state => Object.assign({}, this.state, { status: "waiting" }));
      },
      "started": data => {
        data.message = "Let the games begin!";
        notify(this.props.snackbar, data.message, data.type);
        this.props.setPage('playing');
      },
      "countdown": data => {
        data.message = "Game starting in " + data.value;
        notify(this.props.snackbar, data.message, data.type);
        this.game.interface.controller.wsController.send({'message_type': 'countback', 'value': data.value});
      },
      "finished": data => {
        data.message = userify(data.user) + " won!";
        notify(this.props.snackbar, data.message, data.type);
        this.game.winner = data.user;
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
    return (
      <div>
        <p>{ message }</p>
      </div>
    );
  }
}

class PreGameAdminPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      waitlist: [],
    };

    this.game = this.props.game || {};
    this.props.setGame(loadGame(this.game));

    let userify = usr => usr === this.props.user.id ? "You" : "Someone ";
    this.unmount = addEv(this.game, {
      "notify-join": data => {
        var userPromise = UserModel.FromId(data.joined);
        userPromise.then((user) => {
          this.state.waitlist.push(Object.assign(user, { admitted: false }));
          this.setState(state => state);
        });
      },
      "started": data => {
        data.message = "Let the games begin!";
        notify(this.props.snackbar, data.message, data.type);
        this.props.setPage('playing');
      },
      "countdown": data => {
        data.message = "Game starting in " + data.value;
        notify(this.props.snackbar, data.message, data.type);
        this.game.interface.controller.wsController.send({'message_type': 'countback', 'value': data.value});
      },
      "finished": data => {
        data.message = userify(data.user) + " won!";
        notify(this.props.snackbar, data.message, data.type);
        this.game.winner = data.user;
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
        user.admitted = !user.admitted;
        this.setState(state => state);
        this.game.interface.controller.admitPlayer(user.id, user.admitted);
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
          <p><a ref={ this.link_ref } href={ window.location.origin + "/?code=" + this.game.code + "#play" }>{ window.location.origin + "/?code=" + this.game.code + "#play" }</a></p>
        </l.ListItem>
      </l.ListGroup>;
    }

    let content = <c.Card>
      <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
        <l.List twoLine>
          { invite }
          <l.ListGroup>
            <l.ListItem disabled>
              <p>Users in this game:</p>
            </l.ListItem>
            { this.state.waitlist.map((user, i) =>
                <l.ListItem key={user.display} >
                {user.display}
                <l.ListItemMeta>
                  <Checkbox checked={user.admitted} label="Admitted" onChange={ user.admitted ? () => this.setState(state => state) : () => this.toggleAdmitted(user) } />
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
          <h1>Users to be admitted</h1>
          <g.Grid fixedColumnWidth={ true }>
            <g.GridCell align="left" span={3} />
            <g.GridCell align="right" span={6}>
              { content }
            </g.GridCell>
          </g.Grid>
        </div>
      );
    } else {
      return (
        <div>
          <h1>Users to be admitted</h1>
          { content }
        </div>
      );
    }
  }
}

class CreateGameForm extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      error: null,
      mode: 'rush',
      open: true,
      spectators: true,
      num_players: 4,
      num_tiles: 75,
      tiles_per_player: false,
      start_size: 12,
      draw_size: 1,
      discard_penalty: 3,
      frequency: 1,
    }
  }

  async handleSubmit(event) {
    event.preventDefault();

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
      this.props.setGame(game);

      if (this.props.room === null) {
        this.props.setPage('play');
        this.props.setCode(game.code);
      }
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
    var pl = (num, name) => (""+num+" "+name+(+num === 1 ? "" : "s"));

    return (
      <c.Card>
        <div style={{ padding: '1rem 1rem 1rem 1rem' }} >

          <form onSubmit={ this.handleSubmit.bind(this) }>
            <l.List twoLine>
              <l.ListGroup>
                <l.ListGroupSubheader>Player Options</l.ListGroupSubheader>
                <l.ListItem onClick={(e) => e.target === e.currentTarget && this.toggle("open") }><Switch label="Open for anyone to join (or just those invited)" checked={ this.state.open } onChange={ () => this.toggle("open", true) } /></l.ListItem>
                <l.ListItem onClick={(e) => e.target === e.currentTarget && this.toggle("spectators") }><Switch label="Allow spectators" checked={ this.state.spectators } onChange={ () => this.toggle("spectators", true) } /></l.ListItem>
                <l.ListItem><TextField fullwidth type="number" label="Number of players" name="num_players" value={ this.state.num_players } onChange={ this.inputHandler("num_players") } min="2" max="15" step="1" /></l.ListItem>
              </l.ListGroup>
              <br />
              <br />
              <l.ListGroup>
                <l.ListGroupSubheader>Game Options</l.ListGroupSubheader>
                <Select label="Game Mode" enhanced value={ this.state.mode } onChange={ this.inputHandler("mode") } options={
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
                <l.ListItem><TextField fullwidth type="number" label="Number of tiles" name="num_tiles" value={ this.state.num_tiles } onChange={ this.inputHandler("num_tiles") } min="10" max="200" step="1" /></l.ListItem>
                <l.ListItem>
                  <Switch label="Tiles per player or in total" name="tiles_per_player" checked={ this.state.tiles_per_player } onChange={ () => this.toggle("tiles_per_player", true) } />
                </l.ListItem>
                { this.state.tiles_per_player
                  ? <p>There will be { this.state.num_tiles } tiles per player</p>
                  : <p>There will be { this.state.num_tiles } tiles overall</p>
                }
                <br />
                <Select label="Tile Frequency" enhanced value={ "" + this.state.frequency } onChange={ this.inputHandler("frequency") } options={
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
                <l.ListItem>
                  <TextField fullwidth type="number" label="Player Tile Start Size" name="start_size" value={ this.state.start_size } onChange={ this.inputHandler("start_size") } min="7" max="25" step="1" />
                  <p></p>
                </l.ListItem>
                <l.ListItem><TextField fullwidth type="number" label="Player Tile Draw Size" name="draw_size" value={ this.state.draw_size } onChange={ this.inputHandler("draw_size") } min="1" max="10" step="1" /></l.ListItem>
                <l.ListItem><TextField fullwidth type="number" label="Player Tile Discard Penalty" name="discard_penalty" value={ this.state.discard_penalty } onChange={ this.inputHandler("discard_penalty") } min="1" max="5" step="1" /></l.ListItem>
                <p>Each player will start with { pl(this.state.start_size, "tile") }. Each draw will be { pl(this.state.draw_size, "tile") }, and players who discard a tile will need to draw { this.state.discard_penalty } back.</p>
                <br/>
              </l.ListGroup>
            </l.List>

            <Button label="Create" raised />
          </form>
          <d.Dialog open={ this.state.error !== null } onClosed={() => this.setError(null) }>
            <d.DialogTitle>Error!</d.DialogTitle>
            <d.DialogContent>{ this.state.error }</d.DialogContent>
            <d.DialogActions>
              <d.DialogButton action="close">OK</d.DialogButton>
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
              <d.DialogButton action="close">OK</d.DialogButton>
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

    var game = await GameModel.FromCode(this.props.user, this.state.code);

    if (game.error !== null) {
      // Try loading it as a room instead, before displaying the game error page.
      var room = await RoomModel.FromCode(this.props.user, this.state.code);

      if (room.error !== null) {
        console.error(room.error);
        console.error(game.error);
        this.setError(game.error.message);
      } else {
        if (room.games) {
          game = await GameModel.FromId(this.props.user, room.games[room.games.length - 1]);
          if (game.error !== null) {
            this.props.setGame(game);
          }
        }
        this.props.setCode(room.code);
        this.props.setRoom(room);
        this.props.setPage('room');
      }
    } else {
      this.props.setCode(game.code);
      this.props.setGame(game);
      this.props.setPage('play');
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
    let inner = <g.GridRow>
      <g.GridCell align="left" span={6}>
        <c.Card>
          <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
            <div>
              <Typography use="headline2">Join a Game</Typography>
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
                  <l.ListItem><TextField fullwidth placeholder="Secret Passcode" name="num_players" value={ this.state.code } onChange={ this.inputHandler("code") } /></l.ListItem>
                </l.ListGroup>
              </l.List>

              <Button label="Join" raised />
            </form>
            <d.Dialog open={ this.state.error !== null } onClosed={() => this.setError(null) }>
              <d.DialogTitle>Error!</d.DialogTitle>
              <d.DialogContent>{ this.state.error?.message || this.state.error }</d.DialogContent>
              <d.DialogActions>
                <d.DialogButton action="close">OK</d.DialogButton>
              </d.DialogActions>
            </d.Dialog>
          </div>
        </c.Card>
      </g.GridCell>
      <g.GridCell align="right" span={6}>
        <div style={{ padding: '1rem 0px 1rem 0px' }}>
          <c.Card>
            <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
              <div>
                <Typography use="headline2">Make a Room</Typography>
                <p>
                  <a href="#create-room">Looking to make a new room? Create one here!</a>.<br />
                  A room lets you play multiple games without having to share a new link every time!
                </p>
              </div>
            </div>
          </c.Card>
        </div>
        <div style={{ padding: '1rem 0px 1rem 0px' }}>
          <c.Card>
            <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
              <div>
                <Typography use="headline2">Play a Single Game</Typography>
                <p>
                  <a href="#create-game">Looking to play a single game? Make one here!</a>
                </p>
              </div>
            </div>
          </c.Card>
        </div>
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
  AfterPartyPage,
  CreateGamePage,
  CreateGameForm,
  CreateRoomPage,
  JoinGamePage,
  PreGamePage,
  RushGamePage,
  loadGame
};
