import React from 'react';

import {
  Link,
} from "react-router-dom";

import '../App.css';
import '@rmwc/button/styles';
import '@rmwc/card/styles';
import '@rmwc/dialog/styles';
import '@rmwc/grid/styles';
import '@rmwc/textfield/styles';
import '@rmwc/typography/styles';

import { Button } from '@rmwc/button';
import * as c from '@rmwc/card';
import * as d from '@rmwc/dialog';
import * as g from '@rmwc/grid';
import { TextField } from '@rmwc/textfield';
import { Typography } from '@rmwc/typography';

import { UserModel } from '../models.js';

class LoginForm extends React.Component {
  constructor(props) {
    super(props);

    this.identifier = React.createRef();
    this.password = React.createRef();
    this.token = React.createRef();

    this.state = {
      error: null,
      show2fa: false,
      user: null,
    }
  }

  async handlePasswordSubmit(event) {
    event.preventDefault();

    var user = new UserModel();
    var identifier = this.identifier.current.value;
    if (identifier.includes("@")) {
      user.email = identifier;
    } else {
      user.username = identifier;
    }

    await user.login(this.password.current.value);

    if (user.error) {
      this.setError(user.error.message);
      return;
    }

    if (user.authed) {
      this.props.setUser(user);
      if (!this.props.page || this.props.page === 'login') {
        this.props.setPage('join');
      }
      return;
    }

    this.identifier.current.value = '';
    this.password.current.value = '';
    this.setState(state => Object.assign({}, state, { show2fa: true, user: user }));
  }

  async handle2FASubmit(event) {
    event.preventDefault();

    var user = this.state.user;
    await user.provide2FA(this.token.current.value);

    if (user.error) {
      this.setError(user.error.message);
      return;
    }

    if (user.authed) {
      this.props.setUser(user);
      if (!this.props.page || this.props.page === 'login') {
        this.props.setPage('join');
      }
      return;
    }

    if (!user.authed) {
      this.setError("An unknown error occurred while trying to authenticate. Please try again.");
      this.setState(state => Object.assign({}, state, { show2fa: false, user: null }));
    }
  }

  setError(message) {
    this.setState(state => Object.assign({}, state, { error: message }));
  }

  render() {
    var form = <form onSubmit={ this.handlePasswordSubmit.bind(this) }>
      <TextField fullwidth placeholder="identifier" name="identifier" inputRef={ this.identifier } /><br />
      <TextField fullwidth placeholder="password" name="password" type="password" inputRef={ this.password } /><br />
      <Button label="Login" raised />
    </form>;

    if (this.state.show2fa) {
      form = <form onSubmit={ this.handle2FASubmit.bind(this) }>
        <p>This account is protected with 2FA authentication. Please enter the code from one of your devices to log in.</p>
        <TextField fullwidth placeholder="123456" name="token" inputRef={ this.token } /><br />
        <Button label="Submit" raised />
      </form>
    }

    return (
      <c.Card>
        <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
          <Typography use="headline3">Login</Typography>
          <p className="text-left">
            Enter your username or email and password to log into Willow Patch Games.<br/><br/>
          </p>
          <p>
            <Link to="/signup">New user? Sign up instead!</Link>
          </p>

          { form }
          <d.Dialog open={ this.state.error !== null } onClosed={() => this.setError(null) }>
            <d.DialogTitle>Error!</d.DialogTitle>
            <d.DialogContent>{ this.state.error }</d.DialogContent>
            <d.DialogActions>
              <d.DialogButton action="close" theme="secondary">OK</d.DialogButton>
            </d.DialogActions>
          </d.Dialog>
        </div>
      </c.Card>
    );
  }
}

class LoginPage extends React.Component {
  render() {
    return (
      <div className="App-page">
        <g.Grid fixedColumnWidth={ true }>
          <g.GridCell align="left" span={3} />
          <g.GridCell align="middle" span={6}>
            <LoginForm {...this.props} />
          </g.GridCell>
        </g.Grid>
      </div>
    );
  }
}

export { LoginForm, LoginPage };
