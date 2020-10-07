import React from 'react';

import '../App.css';

import '@rmwc/avatar/styles';
import '@rmwc/button/styles';
import '@rmwc/card/styles';
import '@rmwc/dialog/styles';
import '@rmwc/grid/styles';
import '@rmwc/list/styles';
import '@rmwc/tabs/styles';
import '@rmwc/textfield/styles';
import '@rmwc/typography/styles';

import { Avatar } from '@rmwc/avatar';
import { Button } from '@rmwc/button';
import * as c from '@rmwc/card';
import * as d from '@rmwc/dialog';
import * as g from '@rmwc/grid';
import * as l from '@rmwc/list';
import * as t from '@rmwc/tabs';
import { TextField } from '@rmwc/textfield';
import { Typography } from '@rmwc/typography';

import { LoadingPage } from './common.js';
import { gravatarify } from '../utils/gravatar.js';

class UserProfileTab extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      email: this.props.user.email === null ? "" : this.props.user.email,
      display: this.props.user.display === null ? "" : this.props.user.display,
      nameError: null,
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

  setNameError(message) {
    this.setState(state => Object.assign({}, state, { nameError: message }));
  }

  render() {
    return (
      <div>
        <c.Card>
          <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
            <Avatar src={ gravatarify(this.props.user) } name={ this.state.display } size="xlarge" />
            <p className="text-left">Change your profile picture on <a href="https://www.gravatar.com" target="_blank" rel="noopener noreferrer">Gravatar</a> or add your email to link Gravatar.</p>
          </div>
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
    );
  }
}

class UserSecurityTab extends React.Component {
  constructor(props) {
    super(props);

    this.oldPassword = React.createRef();
    this.newPassword = React.createRef();
    this.confirmPassword = React.createRef();

    this.state = {
      passwordError: null,
    };
  }

  async handlePasswordSubmit(event) {
    event.preventDefault();

    var old_password = this.oldPassword.current.value;
    var new_password = this.newPassword.current.value;
    var confirm_password = this.confirmPassword.current.value;

    if (new_password !== confirm_password) {
      this.setPasswordError("New passwords do not match!");
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

  setPasswordError(message) {
    this.setState(state => Object.assign({}, state, { passwordError: message }));
  }

  render() {
    return (
      <div>
        <c.Card>
          <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
            <p className="text-left">To change your password, enter your old one and what you'd like to change it to.</p>
            <form onSubmit={ this.handlePasswordSubmit.bind(this) }>
              <TextField fullwidth placeholder="old password" name="old" type="password" inputRef={ this.oldPassword } /><br />
              <TextField fullwidth placeholder="new password" name="new" type="password" inputRef={ this.newPassword  } /><br />
              <TextField fullwidth placeholder="confirm password" name="confirm" type="password" inputRef={ this.confirmPassword } /><br />
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
    );
  }
}

class UserPlansTab extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      user_plans: null,
    };
  }

  async componentDidMount() {
    var user_plans = await this.props.user.plans();
    var plans = {};

    for (let plan of user_plans) {
      plans[plan.plan_id] = await plan.plan();
    }

    this.setState(state => Object.assign({}, state, { user_plans, plans }));
  }

  render() {
    var rendered_plans = [];
    if (this.state.user_plans !== null) {
      for (let user_plan of this.state.user_plans) {
        var plan = this.state.plans[user_plan.plan_id];
        rendered_plans.push(
          <>
            <c.Card style={{ padding: '1rem 1rem 1rem 1rem' }}>
              <Typography tag="h3">{ plan.name }</Typography>
              <p className="text-left">{ plan.description }</p>
              <l.ListDivider />
              <p className="text-left">{ user_plan.rooms().length } rooms and { user_plan.games().length } games played under this plan.</p>
            </c.Card>
            <br /><br />
          </>
        );
      }
    }

    return (
      <div>
        { rendered_plans }
      </div>
    );
  }
}

class UserProfilePage extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      tab: 'profile'
    }
  }

  setTab(tab) {
    this.setState(state => Object.assign({}, state, { tab }));
  }

  render() {
    var tab_content = null;
    if (this.state.tab === '' || this.state.tab === 'profile') {
      tab_content = <UserProfileTab {...this.props} />
    } else if (this.state.tab === 'security') {
      tab_content = <UserSecurityTab {...this.props} />
    } else if (this.state.tab === 'plans') {
      tab_content = <UserPlansTab {...this.props} />
    }

    return (
      <div>
        <t.TabBar>
          <t.Tab icon="account_box" label="Profile" onClick={ () => this.setTab('profile') } />
          <t.Tab icon="lock" label="Security" onClick={ () => this.setTab('security') } />
          <t.Tab icon="credit_card" label="Plans" onClick={ () => this.setTab('plans') } />
        </t.TabBar>
        <br />
        <div style={{ width: "65%", margin: "0 auto" }}>
          { tab_content }
        </div>
      </div>
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
      <div className="App-1000px" style={{ "padding-bottom": "5rem" }}>
        <article>
          <Typography use="headline2">Account Preferences</Typography>
          <div>
            { React.createElement(component, this.props, this.props.children) }
          </div>
        </article>
      </div>
    );
  }
}

export { ProfilePage };
