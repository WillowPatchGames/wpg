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

class LoginPage extends React.Component {
  constructor(props) {
    super(props);

    this.username = React.createRef();
    this.password = React.createRef();

    this.state = {
      error: null
    }
  }

  async handleSubmit(event) {
    event.preventDefault();

    var user = new AuthedUserModel();
    user.username = this.username.current.value;
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
      <div>
        <ThemeProvider
          options={{
            surface: 'white',
          }}
        >
          <g.Grid fixedColumnWidth={ true }>
            <g.GridCell align="left" span={3} />
            <g.GridCell align="middle" span={6}>
              <c.Card>
                <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
                  <form onSubmit={ this.handleSubmit.bind(this) }>
                    <TextField fullwidth placeholder="username" name="username" inputRef={ this.username } /><br />
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
        <div className="App-hero">
          <Theme use={ 'onPrimary' } >
            <div className="styles.intro">
              <div>
                <Typography use="headline1">
                  Welcome to WordCorp!
                </Typography>
              </div>
              <div>
                <Typography use="headline2">
                  Home of wonderful word games
                </Typography>
              </div>
              <g.Grid fixedColumnWidth={ true }>
                <g.GridCell align="left" span={2} />
                <g.GridCell align="middle" span={8}>
                  <c.Card>
                    <c.CardPrimaryAction>
                      <p>
                        Hi! I&apos;m Alex and he&apos;s Nick and we&apos;ve created a fun website to play games on.
                        <br /><br />
                        At least, we think it is fun.
                      </p>
                    </c.CardPrimaryAction>
                  </c.Card>
                </g.GridCell>
              </g.Grid>
            </div>
          </Theme>
        </div>
    );
  }
}

class Page extends React.Component {
  render() {
    return (
      <div>
        { this.props.page === 'home' && <HomePage setPage={ this.props.setPage } /> }
        { this.props.page === 'login' && <LoginPage setPage={ this.props.setPage } setUser={ this.props.setUser } /> }
      </div>
    );
  }
}

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
