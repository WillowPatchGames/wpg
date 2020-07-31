import React from 'react';

import './App.css';
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

import { Button } from '@rmwc/button';
import * as c from '@rmwc/card';
import * as d from '@rmwc/dialog';
import * as g from '@rmwc/grid';
import { Typography } from '@rmwc/typography';
import { TextField } from '@rmwc/textfield';
import * as bar from '@rmwc/top-app-bar';
import { Theme, ThemeProvider } from '@rmwc/theme';

// Application imports
import { AuthedUserModel } from './user.js';
import { Navigation } from './nav.js';
import { Page } from './pages.js';

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      page: 'home',
      user: null
    };
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
  }

  render() {
    return (
      <div className="App">
        <ThemeProvider
          options={{
            primary: '#1397BD',
            onPrimary: 'white',
            primaryBg: '#000',
            surface: '#19718A',
          }}
        >

        <Navigation user={ this.state.user } setPage={ this.setPage.bind(this) } setUser={ this.setUser.bind(this) } />
        <Page page={ this.state.page } setUser={ this.setUser.bind(this) } setPage={ this.setPage.bind(this) } />
      </ThemeProvider>

      </div>
    );
  }
}

export default App;
