import React from 'react';

import '@rmwc/top-app-bar/styles';
import 'rmwc/dist/styles';
import '@rmwc/icon/styles';
import '@rmwc/button/styles';
import '@rmwc/card/styles';
import '@rmwc/dialog/styles';
import '@rmwc/grid/styles';
import '@rmwc/typography/styles';
import '@rmwc/textfield/styles';
import '@rmwc/theme/styles';

import { ThemeProvider } from '@rmwc/theme';

// Application imports
import { Navigation } from './nav.js';
import { Page, Footer } from './pages.js';

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

    window.onhashchange = () => this.setPage(window.location.hash.substring(1));
  }

  setUser(user) {
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
        <Page user={ this.state.user } page={ this.state.page } game={ this.state.game } setUser={ this.setUser.bind(this) } setPage={ this.setPage.bind(this) } setGame={ this.setGame.bind(this) } />
        <Footer page={ this.state.page } />
      </ThemeProvider>

      </div>
    );
  }
}

export default App;
