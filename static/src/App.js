import React from 'react';

import '@rmwc/top-app-bar/styles';
import '@rmwc/icon/styles';
import '@rmwc/button/styles';
import '@rmwc/card/styles';
import '@rmwc/dialog/styles';
import '@rmwc/grid/styles';
import '@rmwc/typography/styles';
import '@rmwc/textfield/styles';
import '@rmwc/theme/styles';

import { ThemeProvider } from '@rmwc/theme';

import { SnackbarQueue, createSnackbarQueue } from '@rmwc/snackbar';

// Application imports
import { Navigation } from './nav.js';
import { Page, Footer } from './pages.js';
import { normalizeCode, UserModel } from './models.js';

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
    };

    this.snackbar = createSnackbarQueue();

    window.App = this;

    window.onhashchange = () => this.setPage(window.location.hash.substring(1));
  }

  componentDidMount() {
    this.loadUser();
  }

  async loadUser() {
    console.log("LoadUser()");

    var serialization = localStorage.getItem('user');
    if (!serialization) {
      var guest_serialization = localStorage.getItem('guest');
      if (!guest_serialization) {
        return;
      }
      serialization = guest_serialization;
      console.log("Using: " + guest_serialization)
    }

    var user = UserModel.FromJSON(serialization);
    if (!user || user.token == null) {
      console.log("Bad user? " + user.ToJSON());
      return;
    }

    this.setUser(user);

    var user_id = user.id;
    var token = user.token;

    var verified_user = await UserModel.FromId(user_id, token);
    if (verified_user.error || verified_user.authed === false) {
      console.log("LoadUser() - Got error: " + verified_user.error);
      localStorage.removeItem('user');
      localStorage.removeItem('guest');
      this.setUser(null);
    }

    if (verified_user.display !== user.display || verified_user.username !== user.username || verified_user.email !== user.email) {
      this.setUser(verified_user);
    }
  }

  setUser(user) {
    if (user && user.authed) {
      localStorage.setItem('user', user.ToJSON());
    }

    if (user === null && this.state.user !== null) {
      this.state.user.logout();
      this.setPage('home');
    }

    this.setState(state => Object.assign({}, state, { user}));
  }

  setPage(page) {
    this.setState(state => Object.assign({}, state, { page }));
    window.location.hash = '#' + page;
  }

  setGame(game) {
    console.log(game);
    this.setState(state => Object.assign({}, state, { game }));
  }

  setCode(code) {
    code = normalizeCode(code);
    var params = new URLSearchParams(window.location.search);
    params.set("code", code);
    window.history.pushState(null, '', window.location.pathname + '?' + params.toString());
  }

  render() {
    return (
      <div className="App">
        <ThemeProvider
          options={{
            primary: '#1397BD',
            onPrimary: 'white',
            primaryBg: '#000',
            surface: 'white',
            onSurface: 'black',
            secondary: '#4CAF50',
            background: '#18353D',
            onSecondary: 'white',
            textPrimaryOnBackground: 'black',
            textHintOnBackground: 'black'
          }}
        >

        <Navigation user={ this.state.user } setPage={ this.setPage.bind(this) } setUser={ this.setUser.bind(this) } />
        <Page snackbar={ this.snackbar } user={ this.state.user } page={ this.state.page } game={ this.state.game } setUser={ this.setUser.bind(this) } setPage={ this.setPage.bind(this) } setGame={ this.setGame.bind(this) } setCode={ this.setCode.bind(this) } />
        <SnackbarQueue messages={ this.snackbar.messages } />
        <Footer page={ this.state.page } />
      </ThemeProvider>

      </div>
    );
  }
}

export default App;
