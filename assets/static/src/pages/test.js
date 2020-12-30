// Library imports
import React from 'react';

import {
  Link,
} from "react-router-dom";

import '@rmwc/avatar/styles';
import '@rmwc/button/styles';
import '@rmwc/card/styles';
import '@rmwc/checkbox/styles';
import '@rmwc/dialog/styles';
import '@rmwc/grid/styles';
import '@rmwc/icon/styles';
import '@rmwc/list/styles';
import '@rmwc/select/styles';
import '@rmwc/switch/styles';
import '@rmwc/typography/styles';
import '@rmwc/textfield/styles';

import { Avatar, AvatarCount, AvatarGroup } from '@rmwc/avatar';
import { Button } from '@rmwc/button';
import { Checkbox } from '@rmwc/checkbox';
import * as c from '@rmwc/card';
import * as d from '@rmwc/dialog';
import * as g from '@rmwc/grid';
import { Icon } from '@rmwc/icon';
import * as l from '@rmwc/list';
import { Select } from '@rmwc/select';
import { Switch } from '@rmwc/switch';
import { Typography } from '@rmwc/typography';
import { TextField } from '@rmwc/textfield';

// Application imports
import '../App.css';
import { UserModel, RoomModel, GameModel, normalizeCode, ws } from '../models.js';
import { LoginForm } from './login.js';
import { Game } from '../component.js';
import { RushGame, RushData } from '../games/rush.js';
import { WebSocketController } from '../games/common.js';
import { UserCache, GameCache } from '../utils/cache.js';
import { gravatarify } from '../utils/gravatar.js';

class TestGamePage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {status:"",messages:[],mode:'rush'};
    this.msgRef = React.createRef();
  }
  render() {
    var open = this.state.wsController;
    return (<>
      <details key="details" style={{ maxHeight: "30vh", overflow: "auto" }}>
        <summary>Details</summary>
        <h2>Props</h2>
        <pre style={{textAlign: "left", whiteSpace: "pre"}}>{JSON.stringify(this.props, null, 2)}</pre>
        <h2>State</h2>
        <pre style={{textAlign: "left", whiteSpace: "pre"}}>{JSON.stringify(this.state, null, 2)}</pre>
      </details>
      <Select label="Game Mode" options={['rush','spades']} disabled={ open } value={ this.state.mode } onChange={ e => this.setState(state => {state.mode = e.target.value; return state}) } />
      <ol key="messages">
        {this.state.messages.map((v,k) => <li key={k}>{v.message || JSON.stringify(v.data)}</li>)}
      </ol>
      <form key="open-send" style={{ display: "flex", alignItems: "baseline" }} onSubmit={ e => {e.preventDefault(); open ? this.send(e) : this.open(e)} }>
        <TextField fullwidth placeholder={ open ? "Message" : "Game ID" } inputRef={ this.msgRef } />
        <Button label={ open ? "Send" : "Open" } type="submit" />
      </form>
    </>);
  }
  open() {
    var id = this.msgRef.current.value;
    var mode = this.state.mode;
    console.log("OPEN", id, mode);
    var game = {
      user: this.props.user,
      id: +id,
      mode: mode,
      endpoint: ws() + "//" + document.location.host + "/api/v1/game/" + id + "/ws?user_id=" + this.props.user.id + '&api_token=' + this.props.user.token,
    };
    var wsController = new WebSocketController(game);
    wsController.addEventListener("message", this.receive.bind(this));
    this.setState(state => {
      state.game = game;
      state.wsController = wsController;
      return state;
    });
  }
  send() {
    var message = this.msgRef.current.value;
    try {
      message = JSON.parse(message);
      if (typeof message !== 'object') {
        message = { message_type: message };
      }
    } catch(e) {
      message = { message_type: message };
    }
    this.state.wsController.send(message);
    this.setState(state => {
      state.messages.push(typeof message === 'string' ? { message } : { data: message });
      return state;
    });
  }
  receive(e) {
    console.log(e);
    this.setState(state => {
      state.messages.push({ data: JSON.parse(e.data), timestamp: e.timeStamp });
      return state;
    });
  }
}

export {
  TestGamePage,
}
