import React from 'react';

import {
  withRouter
} from "react-router-dom";

import { RMWCProvider } from '@rmwc/provider';
import { ThemeProvider } from '@rmwc/theme';
import '@rmwc/theme/styles';

import { SnackbarQueue, createSnackbarQueue } from '@rmwc/snackbar';
import '@rmwc/snackbar/styles';

import { Helmet } from "react-helmet";

// Application imports
import { Navigation } from './nav.js';
import { Page, Footer } from './pages.js';
import { normalizeCode, UserModel, RoomModel, GameModel } from './models.js';

import NotificationSoundURI from './notification.mp3';

// CSS overrides last
import './App.css';
import './main.scss';

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      user: null,
      game: null,
      room: null,
      immersive: false,
      notification: null,
      notification_obj: null,
    };

    this.snackbar = createSnackbarQueue();
  }

  async componentDidMount() {
    let user = await this.loadUser();
    if (user !== null && this.state.user !== null) {
      this.loadGame();
    }
  }

  async loadUser() {
    // Before loading the user, we want to initialize a random identifier for
    // use as the session identifier. Since we're passing this into the
    // WebSocket API as a uint64, we want a (large-ish) number here. This
    // simplifies the server design and prevents malicious clients from sending
    // large session identifiers.
    var session_id = parseInt(sessionStorage.getItem('session_id'));
    if (!session_id) {
      session_id = parseInt(Math.random() * 1000000000000);
      sessionStorage.setItem('session_id', session_id);
    }

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

    // Overwrite any previous (outdated) session identifiers.
    user.session_id = session_id;

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

    // Overwrite any previous (outdated) session identifiers.
    user.session_id = session_id;

    if (verified_user.config.turn_push_notification && window && window.Notification) {
      Notification.requestPermission();
    }

    this.setUser(verified_user);
    return verified_user;
  }

  async loadGame() {
    var params = new URLSearchParams(window.location.search);
    let code = params.get("code");
    if (code === null) {
      return;
    }

    code = normalizeCode(code);

    var try_game = code[0] === "g" && (code[1] === "c" || code[1] === "p") && code[2] === '-';
    var try_room = code[0] === "r" && (code[1] === "c" || code[1] === "p") && code[2] === '-';

    if (!try_game && !try_room) {
      try_game = true;
      try_room = true;
    }

    if (try_game) {
      var game = await GameModel.FromCode(this.state.user, code);
      if ((game.error === undefined || game.error === null) && game.lifecycle !== 'deleted') {
        if (game.lifecycle !== 'finished' || window.location.pathname === '/afterparty') {
          this.setGame(game);
          return;
        }
      }
    }

    if (try_room) {
      // Try loading it as a room instead, before displaying the game error page.
      var room = await RoomModel.FromCode(this.state.user, code);
      if (room.error === undefined || room.error === null) {
        this.setRoom(room);
      }
    }
  }

  setUser(user) {
    if (user && user.authed) {
      localStorage.setItem('user', user.ToJSON());
    }

    if (user === null && this.state.user !== null) {
      this.state.user.logout();
      this.setPage('/');
      window.location = '/';
    }

    this.setState(state => Object.assign({}, state, { user }));
  }

  setPage(page, search) {
    if (page === null) {
      return;
    }

    if (page.length === 0 || page[0] !== "/") {
      page = "/" + page;
    }

    if (search !== undefined && search !== null && search !== "" && search !== false) {
      if (search === true) {
        let params = new URLSearchParams(window.location.search);
        let code = params.get("code");
        search = code ? "code="+normalizeCode(code) : "";
      }
      if (search[0] !== "?") {
        search = "?" + search;
      }

      page = page + search;
    }

    let our_page = this.props.history.location;
    our_page = our_page.pathname + our_page.search;
    if (page === our_page) {
      return;
    }

    this.props.history.push(page);
    this.setState(state => Object.assign({}, state));
  }

  setRoom(room) {
    this.setState(state => Object.assign({}, state, { room }));
  }

  setGame(game) {
    this.setState(state => Object.assign({}, state, { game }));
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

  setNotification(notification, old_notification) {
    // To make time-based notification removal possible, add a compare-and-swap
    // mechanism: if the expected old_notification isn't current, don't do
    // anything.
    if (old_notification && !this.state.notification !== old_notification) {
      return;
    }

    // Only update on change, to avoid feedback when nothing has changed.
    if (this.state.notification !== notification) {
      this.setState(state => Object.assign({}, state, { notification }));
      if (this.state.notification_obj) {
        this.state.notification_obj.close();
        this.setState(state => Object.assign({}, state, { notification_obj: null }));
      }

      // Haptic/Vibrate feedback: Edge, Firefox (+Android), Chrome (+Android)
      if (notification && window && window.navigator && window.navigator.vibrate && this.state.user.config.turn_haptic_feedback) {
        window.navigator.vibrate(100);
      }

      // Notification: Edge, Firefox (+Android), Chrome (+Android), Safari
      if (notification && window && window.Notification && window.Notification.permission === "granted" && this.state.user.config.turn_push_notification) {

        var note = new Notification('Willow Patch Games', { body: notification });
        this.setState(state => Object.assign({}, state, { notification_obj: note }));
      }

      // MP3 Sound: IE, Edge, Firefox (+Android), Chrome (+Android), Safari (+iOS)
      if (notification && this.state.user.config.turn_sound_notification) {
        try {
          var alert_sound = new Audio(NotificationSoundURI);
          var alert_promise = alert_sound.play();
          alert_promise.then(null, function(rej) { console.log("Rejection from play:", rej) });
        } catch(no_alert) {}
      }
    }
  }

  render() {
    let notified_title = "%s | Willow Patch Games";
    let notified_default = "Welcome to Willow Patch Games";
    if (this.state.notification !== undefined && this.state.notification !== null && this.state.notification !== "") {
      notified_title = "(" + this.state.notification + ") " + notified_title;
      notified_default = "(" + this.state.notification + ") " + notified_default;
    }

    return (
      <div className={ "App" + (this.state.immersive ? " immersive" : "")} style={{ marginTop: '0px', 'borderTop': '0', 'paddingTop': '0px' }}>
        <Helmet
          titleTemplate={ notified_title }
          defaultTitle={ notified_default }
          defer={ true }
        >
          <meta
            name="description"
            content="Redefining table-top games and updating them for the 21st century
                     WPG: Willow Patch Games"
          />
          <meta name="keywords"
                content="Willow Patch Games, WillowPatchGames, WillowPatch, WPG,
                         social games, word games, family games, friend games,
                         rush!, quarantine games"
          />
        </Helmet>
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
              primaryBg: 'white',
              surface: 'white',
              onSurface: 'black',
              // When secondary changes, update in src/pages/profile.js
              secondary: '#006515',
              secondaryBg: '#006515',
              onSecondary: 'white',
              background: '#18353D',
              onBackground: 'white',
              textPrimaryOnBackground: 'black',
              textHintOnBackground: 'black'
            }}
            style={{ marginTop: '0px', 'borderTop': '0', 'paddingTop': '0px' }}
          >
            <Navigation user={ this.state.user } immersive={ this.state.immersive } setPage={ this.setPage.bind(this) } setUser={ this.setUser.bind(this) } />
            <SnackbarQueue messages={ this.snackbar.messages } />
            <Page
              snackbar={ this.snackbar }

              user={ this.state.user }
              room={ this.state.room }
              game={ this.state.game }
              notification={ this.state.notification }

              setUser={ this.setUser.bind(this) }
              setPage={ this.setPage.bind(this) }
              setRoom={ this.setRoom.bind(this) }
              setGame={ this.setGame.bind(this) }
              setImmersive={ this.setImmersive.bind(this) }
              setNotification={ this.setNotification.bind(this) }

              match={ this.props.match }
              location={ this.props.location }
              history={ this.props.history }
            />
            <Footer />
          </ThemeProvider>
        </RMWCProvider>
      </div>
    );
  }
}

export default withRouter(App);
