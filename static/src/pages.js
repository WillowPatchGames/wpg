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
import { Typography } from '@rmwc/typography';
import { TextField } from '@rmwc/textfield';
import { Theme, ThemeProvider } from '@rmwc/theme';

// Application imports
import { AuthedUserModel, GameModel } from './models.js';
import { GameInterface, APITileManager, JSWordManager } from './game.js';
import { Game } from './component.js';

class RushGamePage extends React.Component {
  constructor(props) {
    super(props);
    this.snackbar = createSnackbarQueue();
    this.state = {};
    this.state.ws = new WebSocket("ws://" + document.location.host + "/game/ws");
    this.state.ws.addEventListener("message", ({ data: buf }) => {
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
    this.state.tilemanager = new APITileManager(this.state.ws);
    this.state.wordmanager = new JSWordManager();
    this.state.wordmanager.fromURL(process.env.PUBLIC_URL + "csw15.txt");
    this.state.data = new GameInterface({
      tiles: this.state.tilemanager,
      words: this.state.wordmanager,
    });
  }
  render () {
    return (
      <div>
        <h1>Ad-hoc game</h1>
        <Game data={ this.state.data } />
        <SnackbarQueue messages={ this.snackbar.messages } />
      </div>
    );
  }
}

class CreateGamePage extends React.Component {
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
      start_size: 7,
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
    game.num_players = this.state.num_players;
    game.num_tiles = this.state.num_tiles;
    game.tiles_per_player = this.state.tiles_per_player;
    game.start_size = this.state.start_size;
    game.draw_size = this.state.draw_size;
    game.discard_penalty = this.state.discard_penalty;

    await game.create();

    if (game.error !== null) {
      this.setError(game.error);
    } else {
      this.props.setGame(game);
    }
  }

  newState(fn, cb) {
    return this.setState(state => Object.assign({}, state, fn(state)));
  }

  inputHandler(name, checky) {
    return (e) => {
      console.log("input");
      var v = checky ? e.target.checked : e.target.value;
      return this.newState(() => ({ [name]: v }));
    };
  }

  toggle(name) {
    console.log("toggle");
    this.newState(state => ({ [name]: !state[name] }));
  }

  setError(message) {
    this.setState(state => Object.assign({}, state, { error: message }));
  }

  render() {
    var pl = (num, name) => (""+num+" "+name+(+num === 1 ? "" : "s"));

    return (
      <div className="App-page">
        <ThemeProvider
          options={{
            surface: 'white',
            onSurface: 'black',
            textPrimaryOnBackground: 'black'
          }}
        >
          <div>
            <Typography use="headline2">Create a Game</Typography>
            <p>
              Invite your friends to play online with you!<br />
            </p>
          </div>
          <g.Grid fixedColumnWidth={ true }>
            <g.GridCell align="left" span={3} />
            <g.GridCell align="middle" span={6}>
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
                          <TextField fullwidth type="number" label="Player Tile Start Size" name="start_size" value={ this.state.start_size } onChange={ this.inputHandler("start_size") } min="4" max="15" step="1" />
                          <p></p>
                        </l.ListItem>
                        <l.ListItem><TextField fullwidth type="number" label="Player Tile Draw Size" name="draw_size" value={ this.state.draw_size } onChange={ this.inputHandler("draw_size") } min="1" max="3" step="1" /></l.ListItem>
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
            </g.GridCell>
          </g.Grid>
        </ThemeProvider>
      </div>
    );
  }
}

class JoinGamePage extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      error: null,
      token: '',
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
    game.num_players = this.state.num_players;
    game.num_tiles = this.state.num_tiles;
    game.tiles_per_player = this.state.tiles_per_player;
    game.start_size = this.state.start_size;
    game.discard_penalty = this.state.discard_penalty;

    await game.create();

    if (game.error !== null) {
      console.error(game.error);
      this.setError(game.error);
    } else {
      this.props.setPage('play');
    }
  }

  newState(fn, cb) {
    return this.setState(state => Object.assign({}, state, fn(state)));
  }

  inputHandler(name, checky) {
    return (e) => {
      console.log("input");
      var v = checky ? e.target.checked : e.target.value;
      return this.newState(() => ({ [name]: v }));
    };
  }

  toggle(name) {
    console.log("toggle");
    this.newState(state => ({ [name]: !state[name] }));
  }

  setError(message) {
    this.setState(state => Object.assign({}, state, { error: message }));
  }

  render() {
    return (
      <div className="App-page">
        <ThemeProvider
          options={{
            surface: 'white',
            onSurface: 'black',
            textPrimaryOnBackground: 'black'
          }}
        >
          <div>
            <Typography use="headline2">Join a Game</Typography>
            <p>
              Good luck, and may the odds be ever in your favor!<br /><br />
              <a href="#create">Looking to make a new game room? Create one here!</a>
            </p>
          </div>
          <g.Grid fixedColumnWidth={ true }>
            <g.GridCell align="left" span={3} />
            <g.GridCell align="middle" span={6}>
              <c.Card>
                <div style={{ padding: '1rem 1rem 1rem 1rem' }} >

                  <form onSubmit={ this.handleSubmit.bind(this) }>
                    <l.List twoLine>
                      <l.ListGroup>
                        <l.ListGroupSubheader>Join game</l.ListGroupSubheader>
                        <l.ListItem><TextField fullwidth label="Token" name="num_players" value={ this.state.token } onChange={ this.inputHandler("token") } /></l.ListItem>
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
          </g.Grid>
        </ThemeProvider>
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

    var user = new AuthedUserModel();
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
        <ThemeProvider
          options={{
            surface: 'white',
          }}
        >
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
        </ThemeProvider>
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

    var user = new AuthedUserModel();
    var identifier = this.identifier.current.value;
    if (identifier.includes("@")) {
      user.email = identifier;
    } else {
      user.username = identifier;
    }

    await user.login(this.password.current.value);

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
        <ThemeProvider
          options={{
            surface: 'white',
          }}
        >
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
        </ThemeProvider>
      </div>
    );
  }
}

class HomePage extends React.Component {
  render() {
    return (
      <div className="App-hero App-page">
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
      </div>
    );
  }
}

class AboutPage extends React.Component {
  render() {
    return (
      <div className="App-page">
        <article>
          <Typography use="headline2">About WordCorp!</Typography>
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse auctor vel lacus et volutpat. Nulla ullamcorper, leo ac egestas ullamcorper, erat neque efficitur libero, sed pretium velit eros luctus leo. Fusce ullamcorper tristique elit, ut gravida tortor vestibulum blandit. Curabitur egestas sagittis feugiat. Nam vitae lorem at lorem consectetur cursus. Mauris ipsum erat, dapibus eget finibus ut, eleifend non sem. Vivamus malesuada sit amet ex in egestas.</p>
          <p>Mauris convallis, risus eget vulputate eleifend, erat neque aliquet ligula, nec suscipit odio neque quis mi. Curabitur varius erat in mi aliquam dapibus. Fusce dictum nibh vitae ipsum porta luctus. Quisque dignissim facilisis egestas. Aliquam iaculis neque sed arcu faucibus, at placerat velit pulvinar. Vivamus imperdiet, libero in laoreet malesuada, leo velit viverra velit, rutrum vestibulum leo mauris sed odio. Donec tincidunt quam lacinia velit mollis porta. Curabitur sed eros scelerisque, molestie ante scelerisque, interdum dui. Vestibulum sit amet volutpat nulla. Suspendisse porttitor ex sit amet hendrerit consequat. Aliquam eros ipsum, fermentum vitae erat sed, pulvinar hendrerit diam. Nullam id dolor mauris. In id porttitor augue, sed commodo turpis. Donec aliquam purus risus, a pellentesque lectus mattis et. Vivamus egestas ultricies suscipit.</p>
          <p>Mauris non aliquet ante, a porta justo. Aenean iaculis urna sed lorem fermentum convallis. Vestibulum auctor, elit nec semper aliquet, mauris erat tincidunt mauris, sed tincidunt odio massa in nunc. Phasellus in facilisis diam. Duis porta maximus arcu. Praesent cursus vel justo sit amet luctus. Donec vitae dictum ligula.</p>
          <p>Nulla et mi rhoncus, vulputate enim vel, feugiat nibh. Aenean quam urna, tempus et sem et, auctor congue metus. Aenean consequat condimentum nibh sit amet eleifend. Donec massa justo, vehicula quis ex ac, porttitor maximus lacus. Praesent rhoncus venenatis turpis, ac elementum libero ultricies vitae. In gravida varius enim ac luctus. Aliquam augue justo, blandit at rutrum quis, rutrum sed lacus. Fusce at velit tortor. Nam vitae imperdiet leo. Proin aliquam iaculis justo, ut aliquet tellus consectetur ac. Donec elementum, velit at tristique bibendum, diam nisl pretium nisi, et cursus nibh odio a nisi. Sed ullamcorper pellentesque lacus, ut aliquet tortor eleifend egestas.</p>
          <p>Proin luctus augue vel faucibus gravida. Integer vehicula feugiat justo, sit amet congue leo sodales et. Maecenas ac fringilla elit. Nulla vitae ultrices enim. Etiam eleifend augue sapien, a vestibulum enim dignissim in. Integer laoreet diam eu dui dictum suscipit. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Vivamus tempus diam eu tellus fringilla varius. Donec tempor auctor condimentum. Sed quis purus luctus, placerat eros et, venenatis mauris. Donec aliquam est urna, eu finibus lectus placerat vitae. Nam id est vitae odio pulvinar ornare et ac mi. Donec tincidunt orci at felis gravida fermentum.</p>
          <p>Aenean nec iaculis urna. Mauris mollis vestibulum ex a rhoncus. Cras eget ligula non tellus mattis luctus eu at enim. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Pellentesque quis lectus nibh. Mauris pharetra quam nunc, ut auctor odio tristique vel. Vivamus gravida leo ex, sed luctus arcu volutpat eget. Sed rhoncus maximus rutrum. Curabitur bibendum tellus sit amet lorem condimentum, in sodales nisi dapibus.</p>
          <p>Nulla facilisi. Mauris porta leo ut lectus euismod finibus. Interdum et malesuada fames ac ante ipsum primis in faucibus. Fusce quis sagittis massa. Mauris vitae gravida mi, et suscipit lectus. Etiam eu lectus maximus, porttitor ante vel, porttitor purus. Nullam auctor purus ut ipsum luctus, non cursus ex congue.</p>
          <p>Integer sem dolor, suscipit nec est at, ultricies venenatis risus. Quisque sollicitudin enim lectus, quis euismod est vulputate scelerisque. Pellentesque vel vestibulum dui. Vivamus sit amet placerat odio. Aenean non lobortis mi. Donec condimentum lorem condimentum mauris venenatis, condimentum viverra tortor pellentesque. Integer scelerisque libero et quam placerat, at aliquet erat porttitor. Pellentesque eu arcu vitae velit porta consectetur volutpat id urna. Sed vehicula finibus nunc, vel egestas dolor imperdiet ut. Donec dapibus ante erat, eu convallis augue egestas ut. Praesent sodales malesuada nisi eu ullamcorper. Sed vel posuere magna. Pellentesque nec justo ante. Nullam turpis massa, ultrices tempus eleifend ac, tempus id nulla. Suspendisse fermentum quam a molestie interdum.</p>
          <p>Nam tristique viverra purus a tincidunt. Curabitur scelerisque purus tempor, sagittis dolor et, vehicula enim. Nam condimentum sem nec enim dictum placerat. Cras quis nulla ut risus ornare egestas. Sed faucibus eleifend nibh, vel aliquet elit. Nullam vel nunc est. Nam blandit sagittis nunc sit amet egestas. In suscipit sodales tortor eu porta. Quisque euismod risus at luctus iaculis. Nulla tincidunt tempus tortor, vel aliquam velit mollis faucibus.</p>
          <p>Cras fringilla et dolor in gravida. Curabitur id consectetur mi, tincidunt dictum libero. Donec sed sem et lorem efficitur posuere at in ante. Integer sit amet orci bibendum, vestibulum erat ac, pellentesque massa. Curabitur pellentesque dictum nisl. Donec non velit nec eros interdum consequat. Aenean rhoncus, nulla sed scelerisque commodo, elit diam convallis lacus, non malesuada enim magna eu enim. Integer a tempor lacus, vel ornare arcu. Pellentesque ultrices tristique elit quis consequat.</p>
          <p>Donec pretium, magna nec tincidunt consectetur, lectus justo dignissim nisl, vitae ornare arcu velit eget risus. Proin aliquet neque a venenatis porttitor. Nunc vestibulum lacus magna, quis elementum nisl congue id. Fusce a elit vel elit scelerisque scelerisque at facilisis diam. Sed dapibus ante eget nisl lobortis porta. Suspendisse sed nunc a urna consequat viverra. Integer consequat velit in ante hendrerit fringilla vel in nisl. Quisque venenatis molestie massa. Aliquam rhoncus magna non diam consectetur bibendum. Nulla bibendum vitae metus vel sagittis. Morbi gravida id purus id consectetur. Vestibulum pellentesque neque ac nisl viverra facilisis sit amet eu felis. Mauris luctus dui eu mauris tempor, a scelerisque orci vulputate. Nulla convallis leo in augue cursus faucibus. In et cursus mi.</p>
          <p>Sed mollis risus eu ex elementum porta. Curabitur auctor nunc quis molestie auctor. Suspendisse sit amet urna hendrerit, varius orci sit amet, vulputate enim. Ut lacus purus, molestie volutpat nibh a, viverra volutpat dolor. Sed dignissim posuere orci, non rhoncus dolor cursus a. Nunc sed neque convallis, egestas sapien non, varius mi. Phasellus venenatis id magna sit amet vestibulum. Donec placerat nibh mauris, a tempor nisl rhoncus gravida. Cras vel elementum lorem. In eget varius odio. Aliquam neque nisl, porta vel tempor ac, posuere molestie nulla. Morbi dolor magna, finibus sed semper ac, scelerisque a turpis. Quisque dictum nisi pulvinar eros sodales, et dictum eros aliquam. Donec semper rutrum lectus quis lobortis. Aenean eget dolor ut diam cursus venenatis.</p>
          <p>Mauris convallis, risus eget vulputate eleifend, erat neque aliquet ligula, nec suscipit odio neque quis mi. Curabitur varius erat in mi aliquam dapibus. Fusce dictum nibh vitae ipsum porta luctus. Quisque dignissim facilisis egestas. Aliquam iaculis neque sed arcu faucibus, at placerat velit pulvinar. Vivamus imperdiet, libero in laoreet malesuada, leo velit viverra velit, rutrum vestibulum leo mauris sed odio. Donec tincidunt quam lacinia velit mollis porta. Curabitur sed eros scelerisque, molestie ante scelerisque, interdum dui. Vestibulum sit amet volutpat nulla. Suspendisse porttitor ex sit amet hendrerit consequat. Aliquam eros ipsum, fermentum vitae erat sed, pulvinar hendrerit diam. Nullam id dolor mauris. In id porttitor augue, sed commodo turpis. Donec aliquam purus risus, a pellentesque lectus mattis et. Vivamus egestas ultricies suscipit.</p>
          <p>Mauris non aliquet ante, a porta justo. Aenean iaculis urna sed lorem fermentum convallis. Vestibulum auctor, elit nec semper aliquet, mauris erat tincidunt mauris, sed tincidunt odio massa in nunc. Phasellus in facilisis diam. Duis porta maximus arcu. Praesent cursus vel justo sit amet luctus. Donec vitae dictum ligula.</p>
          <p>Nulla et mi rhoncus, vulputate enim vel, feugiat nibh. Aenean quam urna, tempus et sem et, auctor congue metus. Aenean consequat condimentum nibh sit amet eleifend. Donec massa justo, vehicula quis ex ac, porttitor maximus lacus. Praesent rhoncus venenatis turpis, ac elementum libero ultricies vitae. In gravida varius enim ac luctus. Aliquam augue justo, blandit at rutrum quis, rutrum sed lacus. Fusce at velit tortor. Nam vitae imperdiet leo. Proin aliquam iaculis justo, ut aliquet tellus consectetur ac. Donec elementum, velit at tristique bibendum, diam nisl pretium nisi, et cursus nibh odio a nisi. Sed ullamcorper pellentesque lacus, ut aliquet tortor eleifend egestas.</p>
          <p>Proin luctus augue vel faucibus gravida. Integer vehicula feugiat justo, sit amet congue leo sodales et. Maecenas ac fringilla elit. Nulla vitae ultrices enim. Etiam eleifend augue sapien, a vestibulum enim dignissim in. Integer laoreet diam eu dui dictum suscipit. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Vivamus tempus diam eu tellus fringilla varius. Donec tempor auctor condimentum. Sed quis purus luctus, placerat eros et, venenatis mauris. Donec aliquam est urna, eu finibus lectus placerat vitae. Nam id est vitae odio pulvinar ornare et ac mi. Donec tincidunt orci at felis gravida fermentum.</p>
          <p>Aenean nec iaculis urna. Mauris mollis vestibulum ex a rhoncus. Cras eget ligula non tellus mattis luctus eu at enim. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Pellentesque quis lectus nibh. Mauris pharetra quam nunc, ut auctor odio tristique vel. Vivamus gravida leo ex, sed luctus arcu volutpat eget. Sed rhoncus maximus rutrum. Curabitur bibendum tellus sit amet lorem condimentum, in sodales nisi dapibus.</p>
          <p>Nulla facilisi. Mauris porta leo ut lectus euismod finibus. Interdum et malesuada fames ac ante ipsum primis in faucibus. Fusce quis sagittis massa. Mauris vitae gravida mi, et suscipit lectus. Etiam eu lectus maximus, porttitor ante vel, porttitor purus. Nullam auctor purus ut ipsum luctus, non cursus ex congue.</p>
          <p>Integer sem dolor, suscipit nec est at, ultricies venenatis risus. Quisque sollicitudin enim lectus, quis euismod est vulputate scelerisque. Pellentesque vel vestibulum dui. Vivamus sit amet placerat odio. Aenean non lobortis mi. Donec condimentum lorem condimentum mauris venenatis, condimentum viverra tortor pellentesque. Integer scelerisque libero et quam placerat, at aliquet erat porttitor. Pellentesque eu arcu vitae velit porta consectetur volutpat id urna. Sed vehicula finibus nunc, vel egestas dolor imperdiet ut. Donec dapibus ante erat, eu convallis augue egestas ut. Praesent sodales malesuada nisi eu ullamcorper. Sed vel posuere magna. Pellentesque nec justo ante. Nullam turpis massa, ultrices tempus eleifend ac, tempus id nulla. Suspendisse fermentum quam a molestie interdum.</p>
          <p>Nam tristique viverra purus a tincidunt. Curabitur scelerisque purus tempor, sagittis dolor et, vehicula enim. Nam condimentum sem nec enim dictum placerat. Cras quis nulla ut risus ornare egestas. Sed faucibus eleifend nibh, vel aliquet elit. Nullam vel nunc est. Nam blandit sagittis nunc sit amet egestas. In suscipit sodales tortor eu porta. Quisque euismod risus at luctus iaculis. Nulla tincidunt tempus tortor, vel aliquam velit mollis faucibus.</p>
          <p>Cras fringilla et dolor in gravida. Curabitur id consectetur mi, tincidunt dictum libero. Donec sed sem et lorem efficitur posuere at in ante. Integer sit amet orci bibendum, vestibulum erat ac, pellentesque massa. Curabitur pellentesque dictum nisl. Donec non velit nec eros interdum consequat. Aenean rhoncus, nulla sed scelerisque commodo, elit diam convallis lacus, non malesuada enim magna eu enim. Integer a tempor lacus, vel ornare arcu. Pellentesque ultrices tristique elit quis consequat.</p>
          <p>Donec pretium, magna nec tincidunt consectetur, lectus justo dignissim nisl, vitae ornare arcu velit eget risus. Proin aliquet neque a venenatis porttitor. Nunc vestibulum lacus magna, quis elementum nisl congue id. Fusce a elit vel elit scelerisque scelerisque at facilisis diam. Sed dapibus ante eget nisl lobortis porta. Suspendisse sed nunc a urna consequat viverra. Integer consequat velit in ante hendrerit fringilla vel in nisl. Quisque venenatis molestie massa. Aliquam rhoncus magna non diam consectetur bibendum. Nulla bibendum vitae metus vel sagittis. Morbi gravida id purus id consectetur. Vestibulum pellentesque neque ac nisl viverra facilisis sit amet eu felis. Mauris luctus dui eu mauris tempor, a scelerisque orci vulputate. Nulla convallis leo in augue cursus faucibus. In et cursus mi.</p>
          <p>Sed mollis risus eu ex elementum porta. Curabitur auctor nunc quis molestie auctor. Suspendisse sit amet urna hendrerit, varius orci sit amet, vulputate enim. Ut lacus purus, molestie volutpat nibh a, viverra volutpat dolor. Sed dignissim posuere orci, non rhoncus dolor cursus a. Nunc sed neque convallis, egestas sapien non, varius mi. Phasellus venenatis id magna sit amet vestibulum. Donec placerat nibh mauris, a tempor nisl rhoncus gravida. Cras vel elementum lorem. In eget varius odio. Aliquam neque nisl, porta vel tempor ac, posuere molestie nulla. Morbi dolor magna, finibus sed semper ac, scelerisque a turpis. Quisque dictum nisi pulvinar eros sodales, et dictum eros aliquam. Donec semper rutrum lectus quis lobortis. Aenean eget dolor ut diam cursus venenatis.</p>
          <p>Mauris convallis, risus eget vulputate eleifend, erat neque aliquet ligula, nec suscipit odio neque quis mi. Curabitur varius erat in mi aliquam dapibus. Fusce dictum nibh vitae ipsum porta luctus. Quisque dignissim facilisis egestas. Aliquam iaculis neque sed arcu faucibus, at placerat velit pulvinar. Vivamus imperdiet, libero in laoreet malesuada, leo velit viverra velit, rutrum vestibulum leo mauris sed odio. Donec tincidunt quam lacinia velit mollis porta. Curabitur sed eros scelerisque, molestie ante scelerisque, interdum dui. Vestibulum sit amet volutpat nulla. Suspendisse porttitor ex sit amet hendrerit consequat. Aliquam eros ipsum, fermentum vitae erat sed, pulvinar hendrerit diam. Nullam id dolor mauris. In id porttitor augue, sed commodo turpis. Donec aliquam purus risus, a pellentesque lectus mattis et. Vivamus egestas ultricies suscipit.</p>
          <p>Mauris non aliquet ante, a porta justo. Aenean iaculis urna sed lorem fermentum convallis. Vestibulum auctor, elit nec semper aliquet, mauris erat tincidunt mauris, sed tincidunt odio massa in nunc. Phasellus in facilisis diam. Duis porta maximus arcu. Praesent cursus vel justo sit amet luctus. Donec vitae dictum ligula.</p>
          <p>Nulla et mi rhoncus, vulputate enim vel, feugiat nibh. Aenean quam urna, tempus et sem et, auctor congue metus. Aenean consequat condimentum nibh sit amet eleifend. Donec massa justo, vehicula quis ex ac, porttitor maximus lacus. Praesent rhoncus venenatis turpis, ac elementum libero ultricies vitae. In gravida varius enim ac luctus. Aliquam augue justo, blandit at rutrum quis, rutrum sed lacus. Fusce at velit tortor. Nam vitae imperdiet leo. Proin aliquam iaculis justo, ut aliquet tellus consectetur ac. Donec elementum, velit at tristique bibendum, diam nisl pretium nisi, et cursus nibh odio a nisi. Sed ullamcorper pellentesque lacus, ut aliquet tortor eleifend egestas.</p>
          <p>Proin luctus augue vel faucibus gravida. Integer vehicula feugiat justo, sit amet congue leo sodales et. Maecenas ac fringilla elit. Nulla vitae ultrices enim. Etiam eleifend augue sapien, a vestibulum enim dignissim in. Integer laoreet diam eu dui dictum suscipit. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Vivamus tempus diam eu tellus fringilla varius. Donec tempor auctor condimentum. Sed quis purus luctus, placerat eros et, venenatis mauris. Donec aliquam est urna, eu finibus lectus placerat vitae. Nam id est vitae odio pulvinar ornare et ac mi. Donec tincidunt orci at felis gravida fermentum.</p>
          <p>Aenean nec iaculis urna. Mauris mollis vestibulum ex a rhoncus. Cras eget ligula non tellus mattis luctus eu at enim. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Pellentesque quis lectus nibh. Mauris pharetra quam nunc, ut auctor odio tristique vel. Vivamus gravida leo ex, sed luctus arcu volutpat eget. Sed rhoncus maximus rutrum. Curabitur bibendum tellus sit amet lorem condimentum, in sodales nisi dapibus.</p>
          <p>Nulla facilisi. Mauris porta leo ut lectus euismod finibus. Interdum et malesuada fames ac ante ipsum primis in faucibus. Fusce quis sagittis massa. Mauris vitae gravida mi, et suscipit lectus. Etiam eu lectus maximus, porttitor ante vel, porttitor purus. Nullam auctor purus ut ipsum luctus, non cursus ex congue.</p>
          <p>Integer sem dolor, suscipit nec est at, ultricies venenatis risus. Quisque sollicitudin enim lectus, quis euismod est vulputate scelerisque. Pellentesque vel vestibulum dui. Vivamus sit amet placerat odio. Aenean non lobortis mi. Donec condimentum lorem condimentum mauris venenatis, condimentum viverra tortor pellentesque. Integer scelerisque libero et quam placerat, at aliquet erat porttitor. Pellentesque eu arcu vitae velit porta consectetur volutpat id urna. Sed vehicula finibus nunc, vel egestas dolor imperdiet ut. Donec dapibus ante erat, eu convallis augue egestas ut. Praesent sodales malesuada nisi eu ullamcorper. Sed vel posuere magna. Pellentesque nec justo ante. Nullam turpis massa, ultrices tempus eleifend ac, tempus id nulla. Suspendisse fermentum quam a molestie interdum.</p>
          <p>Nam tristique viverra purus a tincidunt. Curabitur scelerisque purus tempor, sagittis dolor et, vehicula enim. Nam condimentum sem nec enim dictum placerat. Cras quis nulla ut risus ornare egestas. Sed faucibus eleifend nibh, vel aliquet elit. Nullam vel nunc est. Nam blandit sagittis nunc sit amet egestas. In suscipit sodales tortor eu porta. Quisque euismod risus at luctus iaculis. Nulla tincidunt tempus tortor, vel aliquam velit mollis faucibus.</p>
          <p>Cras fringilla et dolor in gravida. Curabitur id consectetur mi, tincidunt dictum libero. Donec sed sem et lorem efficitur posuere at in ante. Integer sit amet orci bibendum, vestibulum erat ac, pellentesque massa. Curabitur pellentesque dictum nisl. Donec non velit nec eros interdum consequat. Aenean rhoncus, nulla sed scelerisque commodo, elit diam convallis lacus, non malesuada enim magna eu enim. Integer a tempor lacus, vel ornare arcu. Pellentesque ultrices tristique elit quis consequat.</p>
          <p>Donec pretium, magna nec tincidunt consectetur, lectus justo dignissim nisl, vitae ornare arcu velit eget risus. Proin aliquet neque a venenatis porttitor. Nunc vestibulum lacus magna, quis elementum nisl congue id. Fusce a elit vel elit scelerisque scelerisque at facilisis diam. Sed dapibus ante eget nisl lobortis porta. Suspendisse sed nunc a urna consequat viverra. Integer consequat velit in ante hendrerit fringilla vel in nisl. Quisque venenatis molestie massa. Aliquam rhoncus magna non diam consectetur bibendum. Nulla bibendum vitae metus vel sagittis. Morbi gravida id purus id consectetur. Vestibulum pellentesque neque ac nisl viverra facilisis sit amet eu felis. Mauris luctus dui eu mauris tempor, a scelerisque orci vulputate. Nulla convallis leo in augue cursus faucibus. In et cursus mi.</p>
          <p>Sed mollis risus eu ex elementum porta. Curabitur auctor nunc quis molestie auctor. Suspendisse sit amet urna hendrerit, varius orci sit amet, vulputate enim. Ut lacus purus, molestie volutpat nibh a, viverra volutpat dolor. Sed dignissim posuere orci, non rhoncus dolor cursus a. Nunc sed neque convallis, egestas sapien non, varius mi. Phasellus venenatis id magna sit amet vestibulum. Donec placerat nibh mauris, a tempor nisl rhoncus gravida. Cras vel elementum lorem. In eget varius odio. Aliquam neque nisl, porta vel tempor ac, posuere molestie nulla. Morbi dolor magna, finibus sed semper ac, scelerisque a turpis. Quisque dictum nisi pulvinar eros sodales, et dictum eros aliquam. Donec semper rutrum lectus quis lobortis. Aenean eget dolor ut diam cursus venenatis.</p>
          <p>Mauris convallis, risus eget vulputate eleifend, erat neque aliquet ligula, nec suscipit odio neque quis mi. Curabitur varius erat in mi aliquam dapibus. Fusce dictum nibh vitae ipsum porta luctus. Quisque dignissim facilisis egestas. Aliquam iaculis neque sed arcu faucibus, at placerat velit pulvinar. Vivamus imperdiet, libero in laoreet malesuada, leo velit viverra velit, rutrum vestibulum leo mauris sed odio. Donec tincidunt quam lacinia velit mollis porta. Curabitur sed eros scelerisque, molestie ante scelerisque, interdum dui. Vestibulum sit amet volutpat nulla. Suspendisse porttitor ex sit amet hendrerit consequat. Aliquam eros ipsum, fermentum vitae erat sed, pulvinar hendrerit diam. Nullam id dolor mauris. In id porttitor augue, sed commodo turpis. Donec aliquam purus risus, a pellentesque lectus mattis et. Vivamus egestas ultricies suscipit.</p>
          <p>Mauris non aliquet ante, a porta justo. Aenean iaculis urna sed lorem fermentum convallis. Vestibulum auctor, elit nec semper aliquet, mauris erat tincidunt mauris, sed tincidunt odio massa in nunc. Phasellus in facilisis diam. Duis porta maximus arcu. Praesent cursus vel justo sit amet luctus. Donec vitae dictum ligula.</p>
          <p>Nulla et mi rhoncus, vulputate enim vel, feugiat nibh. Aenean quam urna, tempus et sem et, auctor congue metus. Aenean consequat condimentum nibh sit amet eleifend. Donec massa justo, vehicula quis ex ac, porttitor maximus lacus. Praesent rhoncus venenatis turpis, ac elementum libero ultricies vitae. In gravida varius enim ac luctus. Aliquam augue justo, blandit at rutrum quis, rutrum sed lacus. Fusce at velit tortor. Nam vitae imperdiet leo. Proin aliquam iaculis justo, ut aliquet tellus consectetur ac. Donec elementum, velit at tristique bibendum, diam nisl pretium nisi, et cursus nibh odio a nisi. Sed ullamcorper pellentesque lacus, ut aliquet tortor eleifend egestas.</p>
          <p>Proin luctus augue vel faucibus gravida. Integer vehicula feugiat justo, sit amet congue leo sodales et. Maecenas ac fringilla elit. Nulla vitae ultrices enim. Etiam eleifend augue sapien, a vestibulum enim dignissim in. Integer laoreet diam eu dui dictum suscipit. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Vivamus tempus diam eu tellus fringilla varius. Donec tempor auctor condimentum. Sed quis purus luctus, placerat eros et, venenatis mauris. Donec aliquam est urna, eu finibus lectus placerat vitae. Nam id est vitae odio pulvinar ornare et ac mi. Donec tincidunt orci at felis gravida fermentum.</p>
          <p>Aenean nec iaculis urna. Mauris mollis vestibulum ex a rhoncus. Cras eget ligula non tellus mattis luctus eu at enim. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Pellentesque quis lectus nibh. Mauris pharetra quam nunc, ut auctor odio tristique vel. Vivamus gravida leo ex, sed luctus arcu volutpat eget. Sed rhoncus maximus rutrum. Curabitur bibendum tellus sit amet lorem condimentum, in sodales nisi dapibus.</p>
          <p>Nulla facilisi. Mauris porta leo ut lectus euismod finibus. Interdum et malesuada fames ac ante ipsum primis in faucibus. Fusce quis sagittis massa. Mauris vitae gravida mi, et suscipit lectus. Etiam eu lectus maximus, porttitor ante vel, porttitor purus. Nullam auctor purus ut ipsum luctus, non cursus ex congue.</p>
          <p>Integer sem dolor, suscipit nec est at, ultricies venenatis risus. Quisque sollicitudin enim lectus, quis euismod est vulputate scelerisque. Pellentesque vel vestibulum dui. Vivamus sit amet placerat odio. Aenean non lobortis mi. Donec condimentum lorem condimentum mauris venenatis, condimentum viverra tortor pellentesque. Integer scelerisque libero et quam placerat, at aliquet erat porttitor. Pellentesque eu arcu vitae velit porta consectetur volutpat id urna. Sed vehicula finibus nunc, vel egestas dolor imperdiet ut. Donec dapibus ante erat, eu convallis augue egestas ut. Praesent sodales malesuada nisi eu ullamcorper. Sed vel posuere magna. Pellentesque nec justo ante. Nullam turpis massa, ultrices tempus eleifend ac, tempus id nulla. Suspendisse fermentum quam a molestie interdum.</p>
          <p>Nam tristique viverra purus a tincidunt. Curabitur scelerisque purus tempor, sagittis dolor et, vehicula enim. Nam condimentum sem nec enim dictum placerat. Cras quis nulla ut risus ornare egestas. Sed faucibus eleifend nibh, vel aliquet elit. Nullam vel nunc est. Nam blandit sagittis nunc sit amet egestas. In suscipit sodales tortor eu porta. Quisque euismod risus at luctus iaculis. Nulla tincidunt tempus tortor, vel aliquam velit mollis faucibus.</p>
          <p>Cras fringilla et dolor in gravida. Curabitur id consectetur mi, tincidunt dictum libero. Donec sed sem et lorem efficitur posuere at in ante. Integer sit amet orci bibendum, vestibulum erat ac, pellentesque massa. Curabitur pellentesque dictum nisl. Donec non velit nec eros interdum consequat. Aenean rhoncus, nulla sed scelerisque commodo, elit diam convallis lacus, non malesuada enim magna eu enim. Integer a tempor lacus, vel ornare arcu. Pellentesque ultrices tristique elit quis consequat.</p>
          <p>Donec pretium, magna nec tincidunt consectetur, lectus justo dignissim nisl, vitae ornare arcu velit eget risus. Proin aliquet neque a venenatis porttitor. Nunc vestibulum lacus magna, quis elementum nisl congue id. Fusce a elit vel elit scelerisque scelerisque at facilisis diam. Sed dapibus ante eget nisl lobortis porta. Suspendisse sed nunc a urna consequat viverra. Integer consequat velit in ante hendrerit fringilla vel in nisl. Quisque venenatis molestie massa. Aliquam rhoncus magna non diam consectetur bibendum. Nulla bibendum vitae metus vel sagittis. Morbi gravida id purus id consectetur. Vestibulum pellentesque neque ac nisl viverra facilisis sit amet eu felis. Mauris luctus dui eu mauris tempor, a scelerisque orci vulputate. Nulla convallis leo in augue cursus faucibus. In et cursus mi.</p>
          <p>Sed mollis risus eu ex elementum porta. Curabitur auctor nunc quis molestie auctor. Suspendisse sit amet urna hendrerit, varius orci sit amet, vulputate enim. Ut lacus purus, molestie volutpat nibh a, viverra volutpat dolor. Sed dignissim posuere orci, non rhoncus dolor cursus a. Nunc sed neque convallis, egestas sapien non, varius mi. Phasellus venenatis id magna sit amet vestibulum. Donec placerat nibh mauris, a tempor nisl rhoncus gravida. Cras vel elementum lorem. In eget varius odio. Aliquam neque nisl, porta vel tempor ac, posuere molestie nulla. Morbi dolor magna, finibus sed semper ac, scelerisque a turpis. Quisque dictum nisi pulvinar eros sodales, et dictum eros aliquam. Donec semper rutrum lectus quis lobortis. Aenean eget dolor ut diam cursus venenatis.</p>
        </article>
      </div>
    );
  }
}

class Page extends React.Component {
  render() {
    return (
      <>
        { this.props.page === 'home' && <HomePage setPage={ this.props.setPage } /> }
        { this.props.page === 'about' && <AboutPage setPage={ this.props.setPage } /> }
        { this.props.page === 'login' && <LoginPage setPage={ this.props.setPage } setUser={ this.props.setUser } /> }
        { this.props.page === 'signup' && <SignupPage setPage={ this.props.setPage } setUser={ this.props.setUser } /> }
        { this.props.page === 'create' && <CreateGamePage user={ this.props.user } setPage={ this.props.setPage } setGame={ this.props.setGame } /> }
        { this.props.page === 'join' && <JoinGamePage user={ this.props.user } setPage={ this.props.setPage } /> }
        { this.props.page === 'play' && <RushGamePage setPage={ this.props.setPage } /> }
      </>
    );
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
