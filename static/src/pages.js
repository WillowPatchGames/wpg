import React from 'react';

import './App.css';
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
import { Theme, ThemeProvider } from '@rmwc/theme';

// Application imports
import { AuthedUserModel } from './user.js';

class RushGamePage extends React.Component {
  render () {
    return (
      <div>
        <h1>My Cool Game Here</h1>
      </div>
    );
  }
}

class JoinPage extends React.Component {
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
            <Typography use="headline2">Join!</Typography>
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
                    <Button label="Join" raised />
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
              Enter your username or email and password to log into WordCorp.
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

class Page extends React.Component {
  render() {
    return (
      <>
        { this.props.page === 'home' && <HomePage setPage={ this.props.setPage } /> }
        { this.props.page === 'login' && <LoginPage setPage={ this.props.setPage } setUser={ this.props.setUser } /> }
        { this.props.page === 'join' && <JoinPage setPage={ this.props.setPage } setUser={ this.props.setUser } /> }
        { this.props.page === 'play' && <RushGamePage setPage={ this.props.setPage } setUser={ this.props.setUser } /> }
      </>
    );
  }
}

class Footer extends React.Component {
  render() {
    if (this.props.state != 'play') {
      return (
        <div className="App-footer">
          <p style={{ 'font-size': '0.85em' }} >
            Copyright (C) WordCorp<br />
            All Rights Reserved.<br />
          </p>
        </div>
      )
    }
  }
}

export { Page, Footer };
