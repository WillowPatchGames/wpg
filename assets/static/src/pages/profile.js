import React from 'react';

import '../App.css';
import '../main.scss';

import {
  Route,
  Switch,
} from "react-router-dom";

import { Helmet } from "react-helmet";

import { Avatar } from '@rmwc/avatar';
import '@rmwc/avatar/styles';
import { Button } from '@rmwc/button';
import '@rmwc/button/styles';
import * as c from '@rmwc/card';
import '@rmwc/card/styles';
import * as d from '@rmwc/dialog';
import '@rmwc/dialog/styles';
import * as g from '@rmwc/grid';
import '@rmwc/grid/styles';
import * as l from '@rmwc/list';
import '@rmwc/list/styles';
import { Select } from '@rmwc/select';
import '@rmwc/select/styles';
import * as s from '@rmwc/switch';
import '@rmwc/switch/styles';
import * as t from '@rmwc/tabs';
import '@rmwc/tabs/styles';
import { TextField } from '@rmwc/textfield';
import '@rmwc/textfield/styles';
import { ThemeProvider } from '@rmwc/theme';
import '@rmwc/theme/styles';
import { Typography } from '@rmwc/typography';
import '@rmwc/typography/styles';

import { LoadingPage } from './common.js';
import { gravatarify } from '../utils/gravatar.js';

import { formatDistanceToNow } from 'date-fns';

class UserProfileTab extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      email: this.props.user.email === null ? "" : this.props.user.email,
      display: this.props.user.display === null ? "" : this.props.user.display,

      turn_push_notification: this.props.user?.config?.turn_push_notification,
      turn_sound_notification: this.props.user?.config?.turn_sound_notification,
      turn_haptic_feedback: this.props.user?.config?.turn_haptic_feedback,
      auto_ready: this.props.user?.config?.auto_ready,

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

  toggleField(name) {
    var changed_state = {};
    changed_state[name] = !Boolean(this.state[name]);
    this.setState(state => Object.assign({}, state, changed_state));
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

  async handlePreferencesSubmit(event) {
    event.preventDefault();

    var data = {};
    if (this.state.turn_push_notification !== this.props.user.config.turn_push_notification) {
      data['turn_push_notification'] = this.state.turn_push_notification;
    }
    if (this.state.turn_sound_notification !== this.props.user.config.turn_sound_notification) {
      data['turn_sound_notification'] = this.state.turn_sound_notification;
    }
    if (this.state.turn_haptic_feedback !== this.props.user.config.turn_haptic_feedback) {
      data['turn_haptic_feedback'] = this.state.turn_haptic_feedback;
    }
    if (this.state.auto_ready !== this.props.user.config.auto_ready) {
      data['auto_ready'] = this.state.auto_ready;
    }

    await this.props.user.save(data);

    if (this.props.user.error) {
      this.setNameError(this.props.user.error.message);
      return;
    }

    let user = this.props.user;
    this.props.setUser(user);

    this.setState(state => Object.assign({}, state, { turn_push_notification: this.props.user.config.turn_push_notification }));
    this.setState(state => Object.assign({}, state, { turn_sound_notification: this.props.user.config.turn_sound_notification }));
    this.setState(state => Object.assign({}, state, { turn_haptic_feedback: this.props.user.config.turn_haptic_feedback }));
    this.setState(state => Object.assign({}, state, { auto_ready: this.props.user.config.auto_ready }));

    if (this.state.turn_push_notification && window && window.Notification && window.Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  }

  render() {
    return (
      <div>
        <Helmet>
          <title>Profile</title>
        </Helmet>
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
        <Typography use="headline4">Preferences</Typography>
        <c.Card>
          <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
            <p>Changes to preferences don't take effect until they are saved.</p>
            <form onSubmit={ this.handlePreferencesSubmit.bind(this) }>
              <l.List>
                <l.ListGroup>
                  <l.ListItem disabled>
                    <p>Joining Options</p>
                  </l.ListItem>
                  <l.ListItem onClick={ () => this.toggleField('auto_ready') }>
                    <s.Switch checked={ this.state.auto_ready } label={ this.state.auto_ready ? "Automatically Mark Ready" : "Don't Automatically Mark Ready" } onClick={ () => this.toggleField('auto_ready') } />
                  </l.ListItem>
                </l.ListGroup>
                <l.ListGroup>
                  <l.ListItem disabled>
                    <p>Turn Notifications</p>
                  </l.ListItem>
                  <l.ListItem onClick={ () => this.toggleField('turn_push_notification') }>
                    <s.Switch checked={ this.state.turn_push_notification } label={ this.state.turn_push_notification ? "Send Notifications" : "Don't Send Notifications" } onClick={ () => this.toggleField('turn_push_notification') } />
                  </l.ListItem>
                  <l.ListItem onClick={ () => this.toggleField('turn_sound_notification') }>
                    <s.Switch checked={ this.state.turn_sound_notification } label={ this.state.turn_sound_notification ? "Play a Sound" : "Don't Play a Sound" } onClick={ () => this.toggleField('turn_sound_notification') } />
                  </l.ListItem>
                  <l.ListItem onClick={ () => this.toggleField('turn_haptic_feedback') }>
                    <s.Switch checked={ this.state.turn_haptic_feedback } label={ this.state.turn_haptic_feedback ? "Use Haptic Feedback" : "Don't Use Haptic Feedback" } onClick={ () => this.toggleField('turn_haptic_feedback') } />
                  </l.ListItem>
                </l.ListGroup>
              </l.List>
              <Button label="Update" raised />
            </form>
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
    this.renamed = React.createRef();

    this.state = {
      passwordError: null,
      twofaError: null,
      deviceInfo: null,
      devices: null,
      openRenameDialog: false,
      renameDevice: null,
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

  openRenameDialog(openState) {
    this.setState(state => Object.assign({}, state, { openRenameDialog: openState }));
    if (!openState) {
      this.setState(state => Object.assign({}, state, { renameDevice: null }));
      this.reloadDevices();
    }
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

  startRenameDevice(event, device) {
    event.preventDefault();

    this.openRenameDialog(true);
    this.setState(state => Object.assign({}, state, { renameDevice: device }));
  }

  async renameDevice(event) {
    event.preventDefault();

    var device = this.state.renameDevice;
    var result = await this.props.user.rename2FA(device.device, this.renamed.current.value);
    this.openRenameDialog(false);

    if ('type' in result && result['type'] === 'error') {
      this.set2FAError(result.message);
    }

    this.reloadDevices();
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
    this.password.current.value = "";

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
          <p className="text-left">To change your password, enter your old one and what you&#39;d like to change it to.</p>
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
              <Button onClick={ (event) => this.startRenameDevice(event, device) } theme="secondary">Rename</Button>
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
                        <TextField fullwidth placeholder="pasword..." name={ "password-remove-device" + this.state.removeDevice?.device } type="password" inputRef={ this.password } /><br />
                      </form>
                    </d.DialogContent>
                    <d.DialogActions>
                      <d.DialogButton onClick={ (event) => this.removeDevice(event) } theme="secondary">Confirm</d.DialogButton>
                      <d.DialogButton action="close" theme="secondary">Cancel</d.DialogButton>
                    </d.DialogActions>
                  </d.Dialog>
                  <d.Dialog open={ this.state.openRenameDialog === true } onClosed={() => this.openRenameDialog(false) }>
                    <d.DialogTitle>Rename Device</d.DialogTitle>
                    <d.DialogContent>
                      <p>Please enter the new name for this device (currently { this.state.renameDevice?.device }).</p>
                      <form onSubmit={ (event) => this.renameDevice(event) }>
                        <TextField fullwidth placeholder={ this.state.renameDevice?.device } name="device" type="text" inputRef={ this.renamed } /><br />
                      </form>
                    </d.DialogContent>
                    <d.DialogActions>
                      <d.DialogButton onClick={ (event) => this.renameDevice(event) } theme="secondary">Rename</d.DialogButton>
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
        <Helmet>
          <title>Security</title>
        </Helmet>
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
      user_plans: null
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
        var num_games = String(user_plan.games().length);
        var total_games = plan.max_total_games !== -1 ? String(plan.max_total_games) : "Unlimited";
        var num_rooms = String( user_plan.rooms().length);
        var total_rooms = plan.max_total_rooms !== -1 ? String(plan.max_total_rooms) : "Unlimited";
        rendered_plans.push(
          <div key={ user_plan.plan_id }>
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
              {
                (plan.max_total_rooms ?
                  <p className="text-left">You have played { num_games } of { total_games } games and used { num_rooms } of { total_rooms } rooms under this plan.</p>
                :
                  <p className="text-left">You have played { num_games } of { total_games } games under this plan.</p>
                )
              }
            </c.Card>
            <br /><br />
          </div>
        );
      }
    }

    return (
      <div>
        <Helmet>
          <title>Plans</title>
        </Helmet>
        { rendered_plans }
      </div>
    );
  }
}

class UserArchiveTab extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      games: null,
      game_lifecycle: "any",
      rooms: null,
      room_lifecycle: "any",
      room_id: null,
    };
  }

  async componentDidMount() {
    await this.reloadArchive();
  }

  async reloadArchive() {
    var games = await this.props.user.gameSearch(this.state.game_lifecycle, this.state.room_id);
    if (games !== null && games.length === 0) {
      games = null;
    }

    var rooms = await this.props.user.roomSearch(this.state.room_lifecycle);
    if (rooms !== null && rooms.length === 0) {
      rooms = null;
    }

    this.setState(state => Object.assign({}, state, { games, rooms }));
  }

  async handleDeleteGame(game) {
    await game.delete();
    await this.reloadArchive();
  }

  async handleJoinGame(game, room) {
    this.props.setGame(game);
    if (room) {
      var room_code = room?.code ? "?code=" + room.code : null;
      var page = game.lifecycle === "pending" ? "/room/games" : "/game";
      this.props.setRoom(room);
      this.props.setPage(page, room_code);
    } else {
      var game_code = game?.code ? "?code=" + game.code : null;
      game_code = game.lifecycle === "finished" ? null : game_code;
      this.props.setPage('/game', game_code);
    }
  }

  async handleDeleteRoom(room) {
    await room.delete();
    await this.reloadArchive();
  }

  async handleJoinRoom(room) {
    var room_code = room?.code ? "?code=" + room.code : null;
    this.props.setRoom(room);
    this.props.setPage('/room', room_code);
  }

  async handleFilterRoom(room_id) {
    await this.newState(() => ({ room_id }));
    await this.reloadArchive();
  }

  async newState(fn, cb) {
    await this.setState(state => Object.assign({}, state, fn(state)));
    await this.reloadArchive();
  }

  inputHandler(name, checky) {
    return async (e) => {
      var v = checky ? e.target.checked : e.target.value;
      return await this.newState(() => ({ [name]: v }));
    };
  }

  render() {
    var games = null;
    var rooms = null;

    if (this.state.games && this.state.games.type !== 'error' && !this.state.games.error) {
      var loaded_games = [];
      for (let game of this.state.games) {
        loaded_games.push(
          <l.ListItem>
            <l.ListItemText className="double-info">
              <l.ListItemPrimaryText style={{ "textAlign": "left" }}>
                <b>Game #{ game.game_id }</b>&nbsp;-&nbsp;{ game.style }&nbsp;-&nbsp;<i>{ game.lifecycle }</i>
              </l.ListItemPrimaryText>
              <l.ListItemSecondaryText>
                <span className="info-item" title={ game.created_at } style={{ color: "#000" }}>Created { formatDistanceToNow(new Date(game.created_at)) } ago</span>
                <span className="info-spacer"></span>
                <span className="info-item" title={ game.updated_at } style={{ color: "#000" }}>Updated { formatDistanceToNow(new Date(game.updated_at)) } ago</span>
              </l.ListItemSecondaryText>
            </l.ListItemText>
            <l.ListItemMeta className="double-button">
              {
                game.lifecycle !== "deleted" && game.lifecycle !== "expired"
                ? <Button theme="secondary"
                    label={ game.lifecycle !== "finished" ? "Resume" : "Afterparty" }
                    onClick={ () => this.handleJoinGame(game.game, game.room) }
                  />
                : null
              }
              {
                game.lifecycle !== "deleted" && game.lifecycle !== "finished" && game.lifecycle !== "expired" && +game.owner_id === +this.props.user.id
                ? <Button theme="secondary" label="Delete"
                    onClick={ () => this.handleDeleteGame(game.game) }
                  />
                : null
              }
            </l.ListItemMeta>
          </l.ListItem>
        );
      }

      games = <div style={{ padding: '0.5rem 0rem 0.5rem 0rem' }} >
        <c.Card>
          <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
            <l.CollapsibleList handle={
                <l.SimpleListItem text={ <b>Games { this.state.room_id !== null ? "in room #" + this.state.room_id : null  }</b> } metaIcon="chevron_right" />
              }
            >
              <l.List twoLine>
                { loaded_games }
              </l.List>
            </l.CollapsibleList>
          </div>
        </c.Card>
      </div>;
    } else if (this.state.game_lifecycle !== "any") {
      games = <div style={{ padding: '0.5rem 0rem 0.5rem 0rem' }} >
        <c.Card>
          <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
            <p>No games in the { this.state.game_lifecycle } lifecycle.</p>
          </div>
        </c.Card>
      </div>;
    }

    if (this.state.rooms && this.state.rooms.type !== 'error' && !this.state.rooms.error) {
      console.log("OK to iterate rooms:", this.state.rooms);
      var loaded_rooms = [];
      for (let room of this.state.rooms) {
        loaded_rooms.push(
          <l.ListItem>
            <l.ListItemText className="double-info">
              <l.ListItemPrimaryText style={{ "textAlign": "left" }}>
                <b>Room #{ room.room_id }</b>&nbsp;-&nbsp;{ room.style }&nbsp;-&nbsp;<i>{ room.lifecycle }</i>
              </l.ListItemPrimaryText>
              <l.ListItemSecondaryText>
                <span className="info-item" title={ room.created_at } style={{ color: "#000" }}>Created { formatDistanceToNow(new Date(room.created_at)) } ago</span>
                <span className="info-spacer"></span>
                <span className="info-item" title={ room.updated_at } style={{ color: "#000" }}>Updated { formatDistanceToNow(new Date(room.updated_at)) } ago</span>
              </l.ListItemSecondaryText>
            </l.ListItemText>
            <l.ListItemMeta className="double-button">
              {
                room.lifecycle !== "deleted"
                ? <Button theme="secondary"
                    label="Enter"
                    onClick={ () => this.handleJoinRoom(room.room) }
                  />
                : null
              }
              {
                this.state.room_id !== +room.room_id
                ? <Button theme="secondary" label="Filter"
                          onClick={ () => this.handleFilterRoom(+room.room_id) } />
                : <Button theme="secondary" label="Clear"
                          onClick={ () => this.handleFilterRoom(null) } />
              }
              {
                room.lifecycle !== "deleted" && room.lifecycle !== "finished" && room.lifecycle !== "expired" && +room.owner_id === +this.props.user.id
                ? <Button theme="secondary" label="Delete"
                    onClick={ () => this.handleDeleteRoom(room.room) }
                  />
                : null
              }
            </l.ListItemMeta>
          </l.ListItem>
        );
      }

      rooms = <div style={{ padding: '0.5rem 0rem 0.5rem 0rem' }} >
        <c.Card>
          <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
            <l.CollapsibleList handle={
                <l.SimpleListItem text={ <b>Rooms</b> } metaIcon="chevron_right" />
              }
            >
              <l.List twoLine>
                { loaded_rooms }
              </l.List>
            </l.CollapsibleList>
          </div>
        </c.Card>
      </div>
    } else if (this.state.room_lifecycle !== "any") {
      rooms = <div style={{ padding: '0.5rem 0rem 0.5rem 0rem' }} >
        <c.Card>
          <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
            <p>No rooms in the { this.state.room_lifecycle } lifecycle.</p>
          </div>
        </c.Card>
      </div>;
    }

    return (
      <>
        <Helmet>
          <title>Archive</title>
        </Helmet>
        <div style={{ padding: '0.5rem 0rem 0.5rem 0rem' }} >
          <c.Card>
            <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
              <h4>Filter</h4>
              <g.Grid>
                <g.GridCell span={6}>
                  <Select label="Game Lifecycle" enhanced
                    value={ this.state.game_lifecycle }
                    onChange={ this.inputHandler("game_lifecycle") }
                    options={[
                      {
                        "label": "Any",
                        "value": "any",
                      },
                      {
                        "label": "Pending",
                        "value": "pending",
                      },
                      {
                        "label": "Playing",
                        "value": "playing",
                      },
                      {
                        "label": "Finished",
                        "value": "finished",
                      },
                      {
                        "label": "Deleted",
                        "value": "deleted",
                      },
                      {
                        "label": "Expired",
                        "value": "expired",
                      },
                    ]}
                  />
                </g.GridCell>
                <g.GridCell span={6}>
                  <Select label="Room Lifecycle" enhanced
                    value={ this.state.room_lifecycle }
                    onChange={ this.inputHandler("room_lifecycle") }
                    options={[
                      {
                        "label": "Any",
                        "value": "any",
                      },
                      {
                        "label": "Playing",
                        "value": "playing",
                      },
                      {
                        "label": "Deleted",
                        "value": "deleted",
                      },
                      {
                        "label": "Expired",
                        "value": "expired",
                      },
                    ]}
                  />
                </g.GridCell>
              </g.Grid>
              {
                this.state.room_id !== null && this.state.room_id !== 0
                ? <>
                    Limiting to games in room #{ this.state.room_id }.<br />
                    <Button theme="secondary" label="Clear"
                            onClick={ () => this.handleFilterRoom(null) } />
                  </>
                : null
              }
            </div>
          </c.Card>
        </div>
        { games }
        { rooms }
      </>
    );
  }
}

class UserProfilePage extends React.Component {
  render() {
    var paths = ['/profile/overview', '/profile/security', '/profile/plans', '/profile/archive'];
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
            <t.Tab icon="archive" label="Archive" onClick={ () => this.props.setPage('/profile/archive') } />
          </t.TabBar>
        </ThemeProvider>
        <br />
        <div style={{ width: "65%", margin: "0 auto" }}>
          <Switch>
            <Route path="/profile/overview">
              <UserProfileTab {...this.props} />
            </Route>
            <Route path="/profile/security">
              <UserSecurityTab {...this.props} />
            </Route>
            <Route path="/profile/plans">
              <UserPlansTab {...this.props} />
            </Route>
            <Route path="/profile/archive">
              <UserArchiveTab {...this.props} />
            </Route>
            <Route>
              <UserProfileTab {...this.props} />
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
                In order to do too much more with your account, you&#39;ll
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
