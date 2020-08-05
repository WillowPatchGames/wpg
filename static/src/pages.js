import React from 'react';

import './App.css';
import 'rmwc/dist/styles';
import '@rmwc/icon/styles';
import '@rmwc/button/styles';
import '@rmwc/card/styles';
import '@rmwc/dialog/styles';
import '@rmwc/grid/styles';
import '@rmwc/list/styles';
import '@rmwc/select/styles';
import '@rmwc/switch/styles';
import '@rmwc/typography/styles';
import '@rmwc/textfield/styles';
import '@rmwc/theme/styles';

import { SnackbarQueue, createSnackbarQueue } from '@rmwc/snackbar';
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
import { Theme, ThemeProvider } from '@rmwc/theme';

// Application imports
import { UserModel, GameModel, normalizeCode } from './models.js';
import { GameData, GameInterface, APITileManager, JSWordManager } from './game.js';
import { Game } from './component.js';

function loadGame(game) {
  if (!game || !game.endpoint) return null;
  if (!game.ws || game.ws.url !== game.endpoint)
    game.ws = new WebSocket(game.endpoint);
  if (!game.tilemanager)
    game.tilemanager = new APITileManager(game.ws);
  if (!game.wordmanager) {
    game.wordmanager = new JSWordManager();
    game.wordmanager.fromURL(process.env.PUBLIC_URL + "csw15.txt");
  }
  if (!game.data) {
    game.data = new GameInterface({
      tiles: game.tilemanager,
      words: game.wordmanager,
    });
  }
  return game;
}

class RushGamePage extends React.Component {
  constructor(props) {
    super(props);
    this.snackbar = createSnackbarQueue();
    this.state = {};
    this.game = loadGame(this.props.game);
    if (this.game) {
      this.state.data = this.game.data;
      this.game.ws.addEventListener("message", ({ data: buf }) => {
        console.log(buf);
        var data = JSON.parse(buf);
        if (!data) console.log("Error: ", buf);
        if (data.type === "message" || data.type === "draw") {
          this.snackbar.clearAll();
          this.snackbar.notify({
            title: <b>Message</b>,
            body: data.message,
            icon: 'info',
            dismissesOnAction: true,
            timeout: 6000,
            actions: [{ title: "Cool" }],
          });
        } else if (data.error) {
          console.error(data.error);
          this.snackbar.clearAll();
          this.snackbar.notify({
            title: <b>Error</b>,
            body: data.error,
            icon: 'error_outline',
            dismissesOnAction: true,
            timeout: 6000,
            actions: [{ title: "Aw shucks" }],
          });
        } else if (data.type === "gameover") {
          this.game.ws.send(JSON.stringify({
            snapshot: this.game.data.serialize(),
          }));
          this.props.setPage('afterparty');
        }
      });
    }
  }
  render() {
    return (
      <div>
        <h1>Rush! game</h1>
        <Game data={ this.state.data } />
        <SnackbarQueue messages={ this.snackbar.messages } />
      </div>
    );
  }
}

class PreGamePage extends React.Component {
  constructor(props) {
    super(props);
    this.state = null;
    this.admin = this.props.user && (this.props.user?.id === this.props.game?.owner);
  }
  render() {
    return this.admin ? <PreGameAdminPage {...this.props} /> : <PreGameUserPage {...this.props} />
  }
}

class AfterPartyPage extends React.Component {
  constructor(props) {
    super(props);
    this.game = this.props.game;
    this.state = {
      snapshots: null,
    };
  }
  componentDidMount() {
    this.game.ws.addEventListener("message", ({ data: buf }) => {
      console.log(buf);
      var data = JSON.parse(buf);
      if (data.snapshots) {
        data.snapshots = data.snapshots.filter(({ snapshot }) => snapshot);
        for (let snapshot of data.snapshots) {
          var wordmanager = new JSWordManager();
          wordmanager.fromURL(process.env.PUBLIC_URL + "csw15.txt");
          snapshot.game = new GameInterface(
            Object.assign(GameData.deserialize(snapshot.snapshot), {words: wordmanager})
          );
          snapshot.game.grid.padding(0);
        }
        this.setState(state => Object.assign({}, state, { snapshots: data.snapshots }));
      }
    });
    this.game.ws.send(JSON.stringify({"type": "peek"}));
  }
  render() {
    return (
      <div>
        <h1>That was fun, wasn't it?</h1>
        <ol className="results">
          { this.state.snapshots
          ? this.state.snapshots.map(snapshot =>
              <li key={ snapshot.user.display }>
                <h1>{ snapshot.user.display }</h1>
                <Game data={ snapshot.game } readOnly={ true } />
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
    this.snackbar = createSnackbarQueue();
    this.state = {
      status: "pending",
    }
    this.game = this.props.game || {};
    loadGame(this.game);
    this.game.ws.addEventListener("message", ({ data: buf }) => {
      console.log(buf);
      var data = JSON.parse(buf);
      if (!data) console.log("Error: ", buf);
      if (data.type === "message" || data.type === "draw") {
        console.log(data.message);
        this.snackbar.clearAll();
        this.snackbar.notify({
          title: <b>Message</b>,
          body: data.message,
          icon: 'info',
          dismissesOnAction: true,
          timeout: 6000,
          actions: [{ title: "Cool" }],
        });
      } else if (data.type === "admitted") {
        this.setState(state => Object.assign({}, this.state, { status: "waiting" }));
      } else if (data.type === "started") {
        this.props.setPage('playing');
      } else if (data.error) {
        console.error(data.error);
        this.snackbar.clearAll();
        this.snackbar.notify({
          title: <b>Error</b>,
          body: data.error,
          icon: 'error_outline',
          dismissesOnAction: true,
          timeout: 6000,
          actions: [{ title: "Aw shucks" }],
        });
      }
    });
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
        <SnackbarQueue messages={ this.snackbar.messages } />
      </div>
    );
  }
}

class PreGameAdminPage extends React.Component {
  constructor(props) {
    super(props);
    this.snackbar = createSnackbarQueue();
    this.state = {
      waitlist: [],
    };
    this.game = this.props.game || {};
    loadGame(this.game);
    this.game.ws.addEventListener("message", ({ data: buf }) => {
      console.log(buf);
      var data = JSON.parse(buf);
      if (!data) console.log("Error: ", buf);
      if (data.type === "message" || data.type === "draw") {
        console.log(data.message);
        this.snackbar.clearAll();
        this.snackbar.notify({
          title: <b>Message</b>,
          body: data.message,
          icon: 'info',
          dismissesOnAction: true,
          timeout: 6000,
          actions: [{ title: "Cool" }],
        });
      } else if (data.type === "invite") {
        console.log(data.user);
        this.state.waitlist.push(Object.assign(data.user, { admitted: false }));
        this.setState(state => state);
      } else if (data.type === "started") {
        this.props.setPage('playing');
      } else if (data.error) {
        console.error(data.error);
        this.snackbar.clearAll();
        this.snackbar.notify({
          title: <b>Error</b>,
          body: data.error,
          icon: 'error_outline',
          dismissesOnAction: true,
          timeout: 6000,
          actions: [{ title: "Aw shucks" }],
        });
      }
    });
    this.code_ref = React.createRef();
    this.link_ref = React.createRef();
  }
  toggleAdmitted(user) {
    for (let u in this.state.waitlist) {
      if (this.state.waitlist[u] === user) {
        if (user.admitted === false) {
          user.admitted = true;
          this.setState(state => state);
          this.game.ws.send(JSON.stringify({
            "type": "admit",
            "user": user.id,
          }));
        }
      }
    }
  }
  start() {
    this.game.ws.send(JSON.stringify({
      "type": "start",
    }));
    this.props.setPage('playing');
  }
  render() {
    return (
      <div>
        <h1>Users to be admitted</h1>
        <g.Grid fixedColumnWidth={ true }>
          <g.GridCell align="left" span={3} />
          <g.GridCell align="right" span={6}>
            <c.Card>
              <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
                <l.List twoLine>
                  <l.ListGroup>
                    <l.ListItem disabled>
                      <p>Share this code to let users join:</p>
                    </l.ListItem>
                    <l.ListItem onClick={() => { this.code_ref.current.select() ; document.execCommand("copy"); this.snackbar.notify({title: <b>Game invite code copied!</b>, timeout: 3000, dismissesOnAction: true, icon: "info"}); } }>
                      <l.ListItemText className="App-game-code">
                        <TextField fullwidth readOnly value={ this.game.code } inputRef={ this.code_ref } />
                      </l.ListItemText>
                      <l.ListItemMeta icon="content_copy" />
                    </l.ListItem>
                    <l.ListItem disabled>
                      <p>Or have them visit this link:</p>
                    </l.ListItem>
                    <l.ListItem onClick={ () => { var range = document.createRange(); range.selectNode(this.link_ref.current); window.getSelection().removeAllRanges();  window.getSelection().addRange(range); document.execCommand("copy"); this.snackbar.notify({title: <b>Game invite link copied!</b>, timeout: 3000, dismissesOnAction: true, icon: "info"}); }}>
                      <p><a ref={ this.link_ref } href={ window.location.origin + "/?code=" + this.game.code + "#play" }>{ window.location.origin + "/?code=" + this.game.code + "#play" }</a></p>
                    </l.ListItem>
                  </l.ListGroup>
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
            </c.Card>
          </g.GridCell>
        </g.Grid>
        <SnackbarQueue messages={ this.snackbar.messages } />
      </div>
    )
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
      discard_penalty: 3
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

    await game.create();

    if (game.error !== null) {
      this.setError(game.error.message);
    } else {
      this.props.setCode(game.code);
      this.props.setGame(game);
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
      console.error(game.error);
      this.setError(game.error.message);
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
                <a href="#create">Looking to make a new game room? Create one here!</a>
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
        <c.Card>
          <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
            <div>
              <Typography use="headline2">Create a Game</Typography>
              <p>
                <a href="#create">Looking to make a new game room? Create one here!</a>
              </p>
            </div>
          </div>
        </c.Card>
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

class SignupPage extends React.Component {
  constructor(props) {
    super(props);

    this.username = React.createRef();
    this.email = React.createRef();
    this.display = React.createRef();
    this.password = React.createRef();

    this.state = {
      error: null
    }
  }

  async handleSubmit(event) {
    event.preventDefault();

    var user = new UserModel();
    user.username = this.username.current.value;
    user.email = this.email.current.value;
    user.display = this.display.current.value;

    await user.create(this.password.current.value);

    if (user.authed) {
      this.props.setUser(user);
      this.props.setPage('home');
    } else {
      this.setError(user.error.message);
    }
  }

  setError(message) {
    this.setState(state => Object.assign({}, state, { error: message }));
  }

  render() {

    return (
      <div className="App-page">
        <div>
          <Typography use="headline2">Sign up!</Typography>
          <p>
            We&apos;re happy you&apos;re joining WordCorp!<br /><br />
            We only need a username or an email (or both, if you&apos;d like account recovery or notifications) and a password.<br /><br />
            If you&apos;re not happy with your display name being your username, feel free to set one.
          </p>
        </div>
        <g.Grid fixedColumnWidth={ true }>
          <g.GridCell align="left" span={3} />
          <g.GridCell align="middle" span={6}>
            <c.Card>
              <div style={{ padding: '1rem 1rem 1rem 1rem' }} >

                <form onSubmit={ this.handleSubmit.bind(this) }>
                  <TextField fullwidth placeholder="username" name="username" inputRef={ this.username } /><br />
                  <TextField fullwidth placeholder="email" name="email" type="email" inputRef={ this.email } /><br />
                  <TextField fullwidth placeholder="display" name="display" inputRef={ this.display } /><br />
                  <TextField fullwidth placeholder="password" name="password" type="password" inputRef={ this.password } /><br />
                  <Button label="Sign up" raised />
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
          </g.GridCell>
        </g.Grid>
      </div>
    );
  }
}

class LoginPage extends React.Component {
  constructor(props) {
    super(props);

    this.identifier = React.createRef();
    this.password = React.createRef();

    this.state = {
      error: null
    }
  }

  async handleSubmit(event) {
    event.preventDefault();

    var user = new UserModel();
    var identifier = this.identifier.current.value;
    if (identifier.includes("@")) {
      user.email = identifier;
    } else {
      user.username = identifier;
    }

    await user.login(this.password.current.value);

    if (!user.error) {
      this.props.setUser(user);
      if (!this.props.page || this.props.page === 'login') {
        this.props.setPage('join');
      }
    } else {
      this.setError(user.error.message);
    }
  }

  setError(message) {
    this.setState(state => Object.assign({}, state, { error: message }));
  }

  render() {

    return (
      <div className="App-page">
        <div>
          <Typography use="headline2">Login</Typography>
          <p>
            Enter your username or email and password to log into WordCorp.<br/><br/>
            <a href="#signup">New user? Sign up instead!</a>
          </p>
        </div>
        <g.Grid fixedColumnWidth={ true }>
          <g.GridCell align="left" span={3} />
          <g.GridCell align="middle" span={6}>
            <c.Card>
              <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
                <form onSubmit={ this.handleSubmit.bind(this) }>
                  <TextField fullwidth placeholder="identifier" name="identifier" inputRef={ this.identifier } /><br />
                  <TextField fullwidth placeholder="password" name="password" type="password" inputRef={ this.password } /><br />
                  <Button label="Login" raised />
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
          </g.GridCell>
        </g.Grid>
      </div>
    );
  }
}

class HomePage extends React.Component {
  render() {
    return (
      <div className="App-hero App-page">
        <ThemeProvider
          options={{
            surface: '#19718A',
            onSurface: '#06313D'
          }}
        >
          <Theme use={ 'onPrimary' } >
            <div className="styles.intro">
              <div>
                <Typography use="headline2">
                  Welcome to WordCorp!
                </Typography>
              </div>
              <div>
                <Typography use="headline3">
                  Home of wonderful word games
                </Typography>
              </div>
              <p>
                Hi! I&apos;m Alex and he&apos;s Nick and we&apos;ve created a fun website to play games on.
                <br /><br />
                At least, we think it is fun.
              </p>
            </div>
          </Theme>
        </ThemeProvider>
      </div>
    );
  }
}

class AboutPage extends React.Component {
  render() {
    return (
      <div className="App-page">
        <g.Grid fixedColumnWidth={ true }>
          <g.GridCell align="left" span={3} />
          <g.GridCell align="middle" span={6}>
            <article>
              <Typography use="headline2">About WordCorp!</Typography>
              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse auctor vel lacus et volutpat. Nulla ullamcorper, leo ac egestas ullamcorper, erat neque efficitur libero, sed pretium velit eros luctus leo. Fusce ullamcorper tristique elit, ut gravida tortor vestibulum blandit. Curabitur egestas sagittis feugiat. Nam vitae lorem at lorem consectetur cursus. Mauris ipsum erat, dapibus eget finibus ut, eleifend non sem. Vivamus malesuada sit amet ex in egestas.</p>
            </article>
          </g.GridCell>
        </g.Grid>
      </div>
    );
  }
}

class ProfilePage extends React.Component {
  constructor(props) {
    super(props);

    this.email = React.createRef();
    this.display = React.createRef();

    this.state = {
      nameError: null,
      passwordError: null
    };
  }

  handleNamesSubmit() {
    return null;
  }

  handlePasswordSubmit() {
    return null;
  }

  render() {
    return (
      <div className="App-page">
        <g.Grid fixedColumnWidth={ true }>
          <g.GridCell align="left" span={3} />
          <g.GridCell align="middle" span={6}>
            <article>
              <Typography use="headline2">Profile Preferences</Typography>
              <p>Here you can configure your account and change several settings.</p>
              <div>
                <c.Card>
                  <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
                    <form onSubmit={ this.handleNamesSubmit.bind(this) }>
                      <TextField fullwidth placeholder="email" name="email" inputRef={ this.email } /><br />
                      <TextField fullwidth placeholder="display" name="display" inputRef={ this.display } /><br />
                      <Button label="Change Names" raised />
                    </form>
                    <d.Dialog open={ this.state.nameError !== null } onClosed={() => this.setNameError(null) }>
                      <d.DialogTitle>Error!</d.DialogTitle>
                      <d.DialogContent>{ this.state.nameError }</d.DialogContent>
                      <d.DialogActions>
                        <d.DialogButton action="close">OK</d.DialogButton>
                      </d.DialogActions>
                    </d.Dialog>
                  </div>
                </c.Card>
              </div>
              <br /><br />
              <div>
                <c.Card>
                  <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
                    <form onSubmit={ this.handlePasswordSubmit.bind(this) }>
                      <TextField fullwidth placeholder="old password" name="old" inputRef={ this.oldPassword } /><br />
                      <TextField fullwidth placeholder="new password" name="new" inputRef={ this.newPassword  } /><br />
                      <TextField fullwidth placeholder="confirm password" name="confirm" inputRef={ this.confirmPassword } /><br />
                      <Button label="Change Names" raised />
                    </form>
                    <d.Dialog open={ this.state.passwordError !== null } onClosed={() => this.setPasswordError(null) }>
                      <d.DialogTitle>Error!</d.DialogTitle>
                      <d.DialogContent>{ this.state.passwordError }</d.DialogContent>
                      <d.DialogActions>
                        <d.DialogButton action="close">OK</d.DialogButton>
                      </d.DialogActions>
                    </d.Dialog>
                  </div>
                </c.Card>
              </div>
            </article>
          </g.GridCell>
        </g.Grid>
      </div>
    );
  }
}

class ErrorPage extends React.Component {
  render() {
    return "Sorry, an unknown error occurred.";
  }
}

class Page extends React.Component {
  render() {
    var component = ErrorPage;
    switch (this.props.page) {
      case 'home': component = HomePage; break;
      case 'about': component = AboutPage; break;
      case 'login': component = LoginPage; break;
      case 'profile': component = ProfilePage; break;
      case 'signup': component = SignupPage; break;
      case 'create': component = this.props.user ? CreateGamePage : LoginPage; break;
      case 'playing': component = this.props.game ? RushGamePage : JoinGamePage; break;
      case 'play': component = this.props.game ? PreGamePage : JoinGamePage; break;
      case 'afterparty': component = this.props.game ? AfterPartyPage : JoinGamePage; break;
      case 'join': component = JoinGamePage; break;
      default: component = ErrorPage;
    }
    return React.createElement(component, this.props, this.props.children);
  }
}

class Footer extends React.Component {
  render() {
    if (this.props.state !== 'play') {
      return (
        <div className="App-footer">
          <p style={{ fontSize: '0.85em' }} >
            Copyright (C) WordCorp<br />
            All Rights Reserved.<br />
          </p>
        </div>
      )
    }
  }
}

export { Page, Footer };
