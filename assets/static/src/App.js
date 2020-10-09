import React from 'react';

import '@rmwc/top-app-bar/styles';
import '@rmwc/icon/styles';
import '@rmwc/button/styles';
import '@rmwc/card/styles';
import '@rmwc/dialog/styles';
import '@rmwc/grid/styles';
import '@rmwc/snackbar/styles';
import '@rmwc/typography/styles';
import '@rmwc/textfield/styles';
import '@rmwc/theme/styles';

import { RMWCProvider } from '@rmwc/provider';
import { ThemeProvider } from '@rmwc/theme';

import { SnackbarQueue, createSnackbarQueue } from '@rmwc/snackbar';

// Application imports
import { Navigation } from './nav.js';
import { Page, Footer } from './pages.js';
import { normalizeCode, UserModel, RoomModel, GameModel } from './models.js';

// CSS overrides last
import './App.css';

class App extends React.Component {
  constructor(props) {
    super(props);

    const hash = window.location.hash.substring(1);

    this.state = {
      page: hash !== "" ? hash : 'home',
      user: null,
      game: null,
      room: null,
      immersive: false,
    };

    this.snackbar = createSnackbarQueue();

    window.App = this;

    window.onhashchange = () => this.setPage(window.location.hash.substring(1));
  }

  async componentDidMount() {
    let user = await this.loadUser();
    if (user !== null && this.state.user !== null) {
      this.loadGame();
    }
  }

  async loadUser() {
    var serialization = localStorage.getItem('user');
    if (!serialization) {
      var guest_serialization = localStorage.getItem('guest');
      if (!guest_serialization) {
        return;
      }
      serialization = guest_serialization;
    }

    var user = UserModel.FromJSON(serialization);
    if (!user || user.token == null) {
      return;
    }

    this.setUser(user);

    var user_id = user.id;
    var token = user.token;
    var verified_user = await UserModel.FromId(null, token);

    if (verified_user.error || verified_user.authed === false || +user_id !== +verified_user.id) {
      localStorage.removeItem('user');
      localStorage.removeItem('guest');
      this.setUser(null);
      return null;
    }

    if (verified_user.display !== user.display || verified_user.username !== user.username || verified_user.email !== user.email) {
      this.setUser(verified_user);
    }

    return verified_user;
  }

  async loadGame() {
    var params = new URLSearchParams(window.location.search);
    let code = params.get("code");
    if (code === null) {
      return;
    }

    code = normalizeCode(code);

    var game = await GameModel.FromCode(this.state.user, code);
    if (game.error !== null) {
      // Try loading it as a room instead.
      var room = await RoomModel.FromCode(this.state.user, code);
      if (room.error === null || room.error === undefined) {
        this.setCode(code);
        this.setRoom(room);
        this.setPage('room');
      }
    } else {
      this.setCode(code);
      this.setGame(game);
      if (this.state.page === '') {
        this.setPage('play');
      }
    }
  }

  setUser(user) {
    if (user && user.authed) {
      localStorage.setItem('user', user.ToJSON());
    }

    if (user === null && this.state.user !== null) {
      this.state.user.logout();
      this.setPage('home');
      window.location = '/';
    }

    this.setState(state => Object.assign({}, state, { user }));
  }

  setPage(page) {
    if (page !== "" && page !== null) {
      window.location.hash = '#' + page;
    }

    if (this.state.page === page) {
      return;
    }

    if (page === "" || page === null) {
      return;
    }

    this.setState(state => Object.assign({}, state, { page }));
  }

  setRoom(room) {
    this.setState(state => Object.assign({}, state, { room }));
  }

  setGame(game) {
    this.setState(state => Object.assign({}, state, { game }));
  }

  setCode(code) {
    code = normalizeCode(code);
    var params = new URLSearchParams(window.location.search);
    params.set("code", code);
    window.history.pushState(null, '', window.location.pathname + '?' + params.toString());
  }

  setImmersive(immersive) {
    immersive = !!immersive;
    if (this.state.immersive !== immersive) {
      this.setState(state => Object.assign({}, state, { immersive }));
      if (immersive) {
        window.scrollBy({
          top: -window.scrollY,
          left: 0,
          behavior: 'smooth',
        });
      }
    }
  }

  render() {
    return (
      <div className={ "App" + (this.state.immersive ? " immersive" : "")}>
        <RMWCProvider
          typography={{
            headline1: 'h1',
            headline2: 'h2',
            headline3: 'h3',
            headline4: 'h4',
            headline5: 'h5',
            body: 'p',
            body2: 'p',
          }}
        >
          <ThemeProvider
            options={{
              primary: '#d1deeb', // Blue
              // primary: '#d1ebde', // Green
              onPrimary: 'black',
              primaryBg: '#000',
              surface: 'white',
              onSurface: 'black',
              secondary: '#4CAF50',
              background: '#18353D',
              onSecondary: 'black',
              textPrimaryOnBackground: 'black',
              textHintOnBackground: 'black'
            }}
          >
            <Navigation user={ this.state.user } immersive={ this.state.immersive } setPage={ this.setPage.bind(this) } setUser={ this.setUser.bind(this) } />
            <Page snackbar={ this.snackbar } user={ this.state.user } page={ this.state.page } room={ this.state.room } game={ this.state.game } setUser={ this.setUser.bind(this) } setPage={ this.setPage.bind(this) } setRoom={ this.setRoom.bind(this) } setGame={ this.setGame.bind(this) } setCode={ this.setCode.bind(this) } setImmersive={ this.setImmersive.bind(this) } />
            <SnackbarQueue messages={ this.snackbar.messages } />
            <Footer page={ this.state.page } />
          </ThemeProvider>
        </RMWCProvider>
      </div>
    );
  }
}

export default App;
