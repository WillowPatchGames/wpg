import React from 'react';

import '../App.css';

import {
  Route,
  Switch,
} from "react-router-dom";

import '@rmwc/avatar/styles';
import '@rmwc/button/styles';
import '@rmwc/card/styles';
import '@rmwc/dialog/styles';
import '@rmwc/list/styles';
import '@rmwc/tabs/styles';
import '@rmwc/textfield/styles';
import '@rmwc/theme/styles';
import '@rmwc/typography/styles';

import { Avatar } from '@rmwc/avatar';
import { Button } from '@rmwc/button';
import * as c from '@rmwc/card';
import * as d from '@rmwc/dialog';
import * as l from '@rmwc/list';
import * as t from '@rmwc/tabs';
import { TextField } from '@rmwc/textfield';
import { ThemeProvider } from '@rmwc/theme';
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
                <d.DialogButton action="close" theme="secondary">OK</d.DialogButton>
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

    this.device = React.createRef();
    this.validation = React.createRef();
    this.password = React.createRef();

    this.state = {
      passwordError: null,
      twofaError: null,
      deviceInfo: null,
      devices: null,
      openDeleteDialog: false,
      deleteDevice: null,
    };
  }

  componentDidMount() {
    this.reloadDevices();
  }

  async reloadDevices() {
    var devices = await this.props.user.list2FA();
    this.setState(state => Object.assign({}, state, { devices }));
  }

  openDeleteDialog(openState) {
    this.setState(state => Object.assign({}, state, { openDeleteDialog: openState }));
    if (!openState) {
      this.setState(state => Object.assign({}, state, { deleteDevice: null }));
      this.reloadDevices();
    }
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

  async handle2FASubmit(event) {
    event.preventDefault();

    var device = this.device.current.value;

    var result = await this.props.user.enroll2FA(device);
    if ('type' in result && result['type'] === 'error') {
      this.set2FAError(result.message);
    } else {
      this.setState(state => Object.assign({}, state, { deviceInfo: result }));
    }

    this.reloadDevices();
  }

  set2FAError(message) {
    this.setState(state => Object.assign({}, state, { twofaError: message }));
  }

  async handle2FAValidationSubmit(event) {
    event.preventDefault();

    var device = this.state.deviceInfo.device;
    var validation = this.validation.current.value;

    var result = await this.props.user.enrollConfirm2FA(device, validation);
    if ('type' in result && result['type'] === 'error') {
      this.set2FAError(result.message);
    } else {
      this.setState(state => Object.assign({}, state, { deviceInfo: null }));
    }

    this.reloadDevices();
  }

  continueEnrollment(event, device) {
    event.preventDefault();

    var device_info = {
      device: device.device,
      image: this.props.user.totpImage(device.device),
      secret: "",
    };

    this.setState(state => Object.assign({}, state, { deviceInfo: device_info }));
  }

  startRemoveDevice(event, device) {
    event.preventDefault();

    this.openDeleteDialog(true);
    this.setState(state => Object.assign({}, state, { deleteDevice: device }));
  }

  async removeDevice(event) {
    event.preventDefault();

    var device = this.state.deleteDevice;
    var result = await this.props.user.remove2FA(device.device, this.password.current.value);
    this.openDeleteDialog(false);

    if ('type' in result && result['type'] === 'error') {
      this.set2FAError(result.message);
    }

    this.reloadDevices();
  }

  render() {
    var password = <div>
      <c.Card>
        <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
          <Typography tag="h3">Password</Typography>
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
              <d.DialogButton action="close" theme="secondary">OK</d.DialogButton>
            </d.DialogActions>
          </d.Dialog>
        </div>
      </c.Card>
    </div>;

    var twofa_devices = [];
    if (this.state.devices) {
      for (let device of this.state.devices) {
        twofa_devices.push(<l.ListItem key={ device.device }>
          <l.ListItemText>
            <l.ListItemPrimaryText className="text-left">
              { device.device }
            </l.ListItemPrimaryText>
            <l.ListItemSecondaryText>
              <Button onClick={ (event) => this.startRemoveDevice(event, device) } theme="secondary">Delete</Button>
              {
                device.validated
                ? null
                : <Button onClick={ (event) => this.continueEnrollment(event, device) } theme="secondary">Enroll</Button>
              }
            </l.ListItemSecondaryText>
          </l.ListItemText>
          {
            device.validated
            ? <l.ListItemMeta icon="mobile_friendly" />
            : <l.ListItemMeta icon="mobile_off" />
          }
        </l.ListItem>);
      }
    }

    var twofa = <>
      <br />
      <br />
      <div>
        <c.Card>
          <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
            <Typography tag="h3">Two-Factor Authentication (2FA)</Typography>
            { twofa_devices.length > 0
              ? <>
                  <Typography tag="h4">Manage Devices</Typography>
                  <p>The following devices are already enrolled or pending enrollment:</p>
                  <l.List twoLine>
                    { twofa_devices }
                  </l.List>
                  <d.Dialog open={ this.state.openDeleteDialog === true } onClosed={() => this.openDeleteDialog(false) }>
                    <d.DialogTitle>Confirm Device Deletion</d.DialogTitle>
                    <d.DialogContent>
                      <p>To confirm deletion of the device, enter your password.</p>
                      <form onSubmit={ (event) => this.removeDevice(event) }>
                        <TextField fullwidth placeholder="pasword..." name="password" type="password" inputRef={ this.password } /><br />
                      </form>
                    </d.DialogContent>
                    <d.DialogActions>
                      <d.DialogButton onClick={ (event) => this.removeDevice(event) } theme="secondary">Confirm</d.DialogButton>
                      <d.DialogButton action="close" theme="secondary">Cancel</d.DialogButton>
                    </d.DialogActions>
                  </d.Dialog>
                </>
              : null
            }
            <Typography tag="h4">Enroll Device</Typography>
            <p className="text-left">To enroll a new device in 2FA, enter a nickname for the device:</p>
            <form onSubmit={ this.handle2FASubmit.bind(this) }>
              <TextField fullwidth placeholder="primary" name="device" type="text" inputRef={ this.device } /><br />
              <Button label="Enroll" raised />
            </form>
            <br /><br />
            <d.Dialog open={ this.state.twofaError !== null } onClosed={() => this.set2FAError(null) }>
              <d.DialogTitle>Error!</d.DialogTitle>
              <d.DialogContent>{ this.state.twofaError }</d.DialogContent>
              <d.DialogActions>
                <d.DialogButton action="close" theme="secondary">OK</d.DialogButton>
              </d.DialogActions>
            </d.Dialog>
          </div>
        </c.Card>
      </div>
    </>;
    if (this.state.deviceInfo !== null) {
      twofa = <>
        <br />
        <br />
        <div>
          <c.Card>
            <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
              <Typography tag="h3">Finish Enrollment</Typography>
              <p className="text-left">To finish enrolling this device in 2FA, scan the QR code and enter the value from your app:</p>
              <img src={ this.state.deviceInfo.image } alt={ this.state.deviceInfo.secret } width="200" />
              <form onSubmit={ this.handle2FAValidationSubmit.bind(this) }>
                <TextField fullwidth placeholder="123456" name="validation" type="text" inputRef={ this.validation } /><br />
                <Button label="Enroll" raised />
              </form>
            </div>
          </c.Card>
        </div>
        { twofa }
      </>
    }

    return (
      <>
      { password }
      { twofa }
      </>
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
              <Typography tag="h3">
                { plan.name }
                {
                  user_plan.active
                  ? null
                  : <i> Pending</i>
                }
              </Typography>
              <p className="text-left">{ plan.description }</p>
              <hr />
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
  render() {
    var paths = ['/profile/overview', '/profile/security', '/profile/plans'];
    var tab_index = paths.indexOf(window.location.pathname);
    if (tab_index === -1) {
      tab_index = 0;
    }

    return (
      <div>
        <ThemeProvider
          options={{
            primary: '#006515', // Dark Green -- Theme's secondary
            onPrimary: 'black',
            primaryBg: 'white',
          }}
        >
          <t.TabBar activeTabIndex={ tab_index }>
            <t.Tab icon="account_box" label="Profile" onClick={ () => this.props.setPage('/profile/overview') } />
            <t.Tab icon="lock" label="Security" onClick={ () => this.props.setPage('/profile/security') } />
            <t.Tab icon="credit_card" label="Plans" onClick={ () => this.props.setPage('/profile/plans') } />
          </t.TabBar>
        </ThemeProvider>
        <br />
        <div style={{ width: "65%", margin: "0 auto" }}>
          <Switch>
            <Route exact path="/profile">
              <UserProfileTab {...this.props} />
            </Route>
            <Route path="/profile/overview">
              <UserProfileTab {...this.props} />
            </Route>
            <Route path="/profile/security">
              <UserSecurityTab {...this.props} />
            </Route>
            <Route path="/profile/plans">
              <UserPlansTab {...this.props} />
            </Route>
          </Switch>
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
    }

    window.location.reload();
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
                  <d.DialogButton action="close" theme="secondary">OK</d.DialogButton>
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
      <div className="App-1000px" style={{ "paddingBottom": "5rem" }}>
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
