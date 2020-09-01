import React from 'react';

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

import { LoadingPage } from './common.js';

class UserProfilePage extends React.Component {
  constructor(props) {
    super(props);

    this.oldPassword = React.createRef();
    this.newPassword = React.createRef();
    this.confirmPassword = React.createRef();

    this.state = {
      email: this.props.user.email === null ? "" : this.props.user.email,
      display: this.props.user.display === null ? "" : this.props.user.display,
      nameError: null,
      passwordError: null,
    };
  }

  inputHandler(name) {
    if (name === "email") {
      return (e) => {
        var value = e.target.value;
        this.setState(state => Object.assign({}, state, { email: value }));
      }
    } else if (name === "display") {
      return (e) => {
        var value = e.target.value;
        this.setState(state => Object.assign({}, state, { display: value }));
      }
    } else {
      console.log("Unknown name: " + name);
    }
  }

  async handleNamesSubmit(event) {
    event.preventDefault();

    var data = {};
    if (this.state.email !== this.props.user.email) {
      data['email'] = this.state.email;
    }
    if (this.state.display !== this.props.user.display) {
      data['display'] = this.state.display;
    }

    await this.props.user.save(data);

    if (this.props.user.error) {
      this.setNameError(this.props.user.error.message);
      return;
    }

    let user = this.props.user;
    this.props.setUser(user);

    this.setState(state => Object.assign({}, state, { email: this.props.user.email === null ? "" : this.props.user.email }));
    this.setState(state => Object.assign({}, state, { display: this.props.user.display === null ? "" : this.props.user.display }));
  }

  async handlePasswordSubmit(event) {
    event.preventDefault();

    var old_password = this.oldPassword.current.value;
    var new_password = this.newPassword.current.value;
    var confirm_password = this.confirmPassword.current.value;

    if (new_password !== confirm_password) {
      this.setPasswordError("New and old passwords don't match!");
      return;
    }

    var data = {
      'old_password': old_password,
      'new_password': new_password
    };

    await this.props.user.save(data);

    if (!this.props.user.error) {
      this.oldPassword.current.value = "";
      this.newPassword.current.value = "";
      this.confirmPassword.current.value = "";
    } else {
      this.setPasswordError(this.props.user.error.message);
    }
  }

  setNameError(message) {
    this.setState(state => Object.assign({}, state, { nameError: message }));
  }

  setPasswordError(message) {
    this.setState(state => Object.assign({}, state, { passwordError: message }));
  }

  render() {
    return (
      <>
        <div>
          <c.Card>
            <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
              <form onSubmit={ this.handleNamesSubmit.bind(this) }>
                <TextField fullwidth placeholder="email" name="email" value={ this.state.email } onChange={ this.inputHandler("email") } /><br />
                <TextField fullwidth placeholder="display" name="display" value={ this.state.display } onChange={ this.inputHandler("display") } /><br />
                <Button label="Save" raised />
              </form>
              <d.Dialog open={ this.state.nameError !== null } onClosed={() => this.setNameError(null) }>
                <d.DialogTitle>Error!</d.DialogTitle>
                <d.DialogContent>{ this.state.nameError }</d.DialogContent>
                <d.DialogActions>
                  <d.DialogButton action="close">OK</d.DialogButton>
                </d.DialogActions>
              </d.Dialog>
            </div>
          </c.Card>
        </div>
        <br /><br />
        <div>
          <c.Card>
            <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
              <form onSubmit={ this.handlePasswordSubmit.bind(this) }>
                <TextField fullwidth placeholder="old password" name="old" inputRef={ this.oldPassword } /><br />
                <TextField fullwidth placeholder="new password" name="new" inputRef={ this.newPassword  } /><br />
                <TextField fullwidth placeholder="confirm password" name="confirm" inputRef={ this.confirmPassword } /><br />
                <Button label="Change Password" raised />
              </form>
              <d.Dialog open={ this.state.passwordError !== null } onClosed={() => this.setPasswordError(null) }>
                <d.DialogTitle>Error!</d.DialogTitle>
                <d.DialogContent>{ this.state.passwordError }</d.DialogContent>
                <d.DialogActions>
                  <d.DialogButton action="close">OK</d.DialogButton>
                </d.DialogActions>
              </d.Dialog>
            </div>
          </c.Card>
        </div>
      </>
    );
  }
}

class GuestProfilePage extends React.Component {
  constructor(props) {
    super(props);

    this.username = React.createRef();
    this.email = React.createRef();
    this.display = React.createRef();
    this.password = React.createRef();

    this.state = {
      username: null,
      email: null,
      display: this.props.user.display,
      password: null,
      upgradeError: null,
    };
  }

  async handleUpgradeSubmit(event) {
    event.preventDefault();

    var username = this.username.current.value;
    var email = this.email.current.value;
    var display = this.display.current.value;
    var password = this.password.current.value;

    if (!username && !email) {
      this.setUpgradeError("You need to provide either a username or an email to register a new user account.");
      return;
    }

    if (!username && !display) {
      this.setUpgradeError("You need to provide either a username or a display name to identify your account to others.");
      return;
    }

    if (!password) {
      this.setUpgradeError("You need to provide a password to log in with.");
      return;
    }

    console.log(username, email, display, password);

    await this.props.user.upgrade(username, email, display, password);

    if (this.props.user.error) {
      this.setUpgradeError(this.props.user.error.message);
      return;
    } else {
      this.props.setPage('profile');
    }
  }

  setUpgradeError(message) {
    this.setState(state => Object.assign({}, state, { upgradeError: message }));
  }

  render() {
    return (
      <>
        <div>
          <c.Card>
            <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
              <Typography use="headline3">Upgrade your Account</Typography>
              <p>
                In order to do too much more with your account, you'll
                need to upgrade it to a full account.
              </p>
              <form onSubmit={ this.handleUpgradeSubmit.bind(this) }>
                <TextField fullwidth placeholder="username" name="username" defaultValue={ this.state.username || "" } inputRef={ this.username } /><br />
                <TextField fullwidth placeholder="email" name="email" defaultValue={ this.state.email || "" } inputRef={ this.email } /><br />
                <TextField fullwidth placeholder="display" name="display" defaultValue={ this.state.display } inputRef={ this.display } /><br />
                  <TextField fullwidth placeholder="password" name="password" type="password" defaultValue={ this.state.password || "" } inputRef={ this.password } /><br />
                <Button label="Upgrade Account" raised />
              </form>
              <d.Dialog open={ this.state.upgradeError !== null } onClosed={() => this.setUpgradeError(null) }>
                <d.DialogTitle>Error upgrading your Account!</d.DialogTitle>
                <d.DialogContent>{ this.state.upgradeError }</d.DialogContent>
                <d.DialogActions>
                  <d.DialogButton action="close">OK</d.DialogButton>
                </d.DialogActions>
              </d.Dialog>
            </div>
          </c.Card>
        </div>
      </>
    );
  }
}

class ProfilePage extends React.Component {
  render() {
    var component = LoadingPage;

    if (this.props.user) {
      if (this.props.user.guest) {
        component = GuestProfilePage;
      } else {
        component = UserProfilePage;
      }
    }

    return (
      <div className="App-page">
        <g.Grid fixedColumnWidth={ true }>
          <g.GridCell align="left" span={3} />
          <g.GridCell align="middle" span={6}>
            <article>
              <Typography use="headline2">Profile Preferences</Typography>
              <p>Here you can configure your account and change several settings.</p>
              <div>
                { React.createElement(component, this.props, this.props.children) }
              </div>
            </article>
          </g.GridCell>
        </g.Grid>
      </div>
    );
  }
}

export { ProfilePage };
