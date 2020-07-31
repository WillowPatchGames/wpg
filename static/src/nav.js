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

class AuthedNavComponent extends React.Component {
  render() {
    if (this.props.user !== null && this.props.user.authed) {
      return (
        <div>
          <Button label="Play" icon="games" unelevated  onClick={() => this.props.setPage('play') } />
          <Button label={ this.props.user.display } icon="person" unelevated />
          <Button label="Logout" icon="logout" unelevated onClick={() => this.props.setUser(null) } />
          <Button label="About" icon="notes" unelevated />
        </div>
      );
    }

    return (
      <div>
        <Button label="Login" icon="login" unelevated onClick={() => this.props.setPage('login') } />
        <Button label="Join" icon="person_add" unelevated />
        <Button label="About" icon="notes" unelevated />
      </div>
    );
  }
}

class Navigation extends React.Component {
  render() {
    return (
      <header>
        <bar.TopAppBar fixed>
          <bar.TopAppBarRow>
            <bar.TopAppBarSection alignStart>
              <bar.TopAppBarNavigationIcon icon="home" onClick={() => this.props.setPage('home') } />
              <bar.TopAppBarTitle>WordCorp</bar.TopAppBarTitle>
            </bar.TopAppBarSection>
            <bar.TopAppBarSection alignEnd>
              <AuthedNavComponent user={ this.props.user } setPage={ this.props.setPage } setUser={ this.props.setUser } />
            </bar.TopAppBarSection>
          </bar.TopAppBarRow>
        </bar.TopAppBar>
        <bar.TopAppBarFixedAdjust />
        <nav>
        </nav>
      </header>
    );
  }
}

export {
  Navigation
};
