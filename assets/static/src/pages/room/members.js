import React from 'react';

import {
  Link,
} from "react-router-dom";

import { Helmet } from "react-helmet";

import { Button } from '@rmwc/button';
import '@rmwc/button/styles';
import * as c from '@rmwc/card';
import '@rmwc/card/styles';
import { Checkbox } from '@rmwc/checkbox';
import '@rmwc/checkbox/styles';
import * as g from '@rmwc/grid';
import '@rmwc/grid/styles';
import * as l from '@rmwc/list';
import '@rmwc/list/styles';
import { Typography } from '@rmwc/typography';
import '@rmwc/typography/styles';
import { TextField } from '@rmwc/textfield';
import '@rmwc/textfield/styles';

import { formatDistanceToNow } from 'date-fns';

import '../../App.css';

import { killable } from '../games.js';

class RoomMembersTab extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      timeout: killable(() => { this.checkForGames() }, 5000),
      dummy: null,
      members: this.props.room.members,
      room_owner: +this.props.user.id === +this.props.room.owner,
      not_admitted: 0,
      video_chat: this.props.room.config?.video_chat,
    };

    this.code_ref = React.createRef();
    this.temp_code_ref = React.createRef();
    this.link_ref = React.createRef();
  }

  componentDidMount() {
    this.state.timeout.exec();
  }

  componentWillUnmount() {
    if (this.state.timeout) {
      this.state.timeout.kill();
    }
  }

  async checkForGames() {
    // XXX: Convert to WebSocket
    await this.props.room.update();

    this.setState(state => Object.assign({}, state, { members: this.props.room.members }));
  }

  async generateTempCode() {
    var ret = await this.props.room.generateTempCode();
    if (ret && (ret.error || ret.type === "error")) {
      console.log(ret);
    }

    await this.props.room.update();
    this.setState(state => Object.assign({}, state));
  }

  async updateConfig() {
    if (!this.props.room.config) {
      this.props.room.config = {};
    }
    this.props.room.config.video_chat = this.state.video_chat;

    var ret = await this.props.room.save();
    if (ret && (ret.error || ret.type === "error")) {
      console.log(ret);
    }

    await this.props.room.update();
    this.setState(state => Object.assign({}, state, { video_chat: this.props.room.config.video_chat }));
  }

  async toggleAdmitted(member) {
    if (!this.state.room_owner || member.user_id === this.props.room.owner) {
      return;
    }

    member.admitted = !member.admitted;
    this.setState(state => Object.assign({}, state));
    await this.props.room.admitPlayer(member.user_id, member.admitted, member.banned);
    this.setState(state => Object.assign({}, state, { members: this.props.room.members }));
  }

  newState(fn, cb) {
    return this.setState(state => Object.assign({}, state, fn(state)));
  }

  inputHandler(name, checky) {
    return (e) => {
      var v = checky ? e.target.checked : e.target.value;
      return this.newState(() => ({ [name]: v }));
    };
  }

  render() {
    var left_panel = null;
    var right_panel = null;

    var chat = null;
    if (this.state.room_owner) {
      chat = <>
        <l.ListItem disabled key="chat-desc">
          <p>Configure external video chat link:</p>
        </l.ListItem>
        <l.ListItem key="chat-code">
          <l.ListItemText className="App-game-code">
            <TextField fullwidth value={ this.state.video_chat } onChange={ this.inputHandler("video_chat") } />
          </l.ListItemText>
        </l.ListItem>
        <l.ListItem disabled key="chat-submit">
          <Button label="Update" raised onClick={() => this.updateConfig() } />
        </l.ListItem>
      </>;
    } else {
      if (this.props.room.config.video_chat !== undefined && this.props.room.config.video_chat !== null && this.props.room.config.video_chat.length > 0) {
        chat = <>
          <l.ListItem disabled key="chat">
            <p>This room has an external video chat link:<br />
              <a href={ this.props.room.config.video_chat } target="_blank" rel="noopener noreferrer">
                { this.props.room.config.video_chat }
              </a>
            </p>
          </l.ListItem>
        </>;
      }
    }

    if (this.state.room_owner) {
      let temporary = <>
        <l.ListGroup>
          <l.ListItem disabled>
            <p>Generate a temporary, short join code for sharing in-person.</p>
          </l.ListItem>
          <l.ListItem disabled key="temporary-commit">
            <Button label="Generate" raised onClick={() => this.generateTempCode() } />
          </l.ListItem>
        </l.ListGroup>
      </>;

      if (this.props.room.temporary_code) {
        temporary = <>
          <l.ListGroup>
            <l.ListItem disabled>
              <p>Temporary Join Code:</p>
            </l.ListItem>
            <l.ListItem key="temp-join-code" onClick={() => { this.temp_code_ref.current.select() ; document.execCommand("copy"); this.props.snackbar.notify({title: <b>Temporary room invite code copied!</b>, timeout: 3000, dismissesOnAction: true, icon: "info"}); } }>
              <l.ListItemText className="App-game-code">
                <TextField fullwidth readOnly value={ this.props.room.temporary_code } inputRef={ this.temp_code_ref } />
              </l.ListItemText>
              <l.ListItemMeta icon="content_copy" />
            </l.ListItem>
            <l.ListItem disabled>
              <p>Expires in { formatDistanceToNow(new Date(this.props.room.temporary_code_expiration)) }</p>
            </l.ListItem>
          </l.ListGroup>
        </>;
      }

      left_panel = <>
        <article key={"joining"} className="text">
          <Typography use="headline3">Joining</Typography>
          <c.Card>
            <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
              <l.List twoLine>
                <l.ListGroup>
                  <l.ListItem disabled key="join">
                    <p>Share this code to let users join:</p>
                  </l.ListItem>
                  <l.ListItem key="join-code" onClick={() => { this.code_ref.current.select() ; document.execCommand("copy"); this.props.snackbar.notify({title: <b>Room invite code copied!</b>, timeout: 3000, dismissesOnAction: true, icon: "info"}); } }>
                    <l.ListItemText className="App-game-code">
                      <TextField fullwidth readOnly value={ this.props.room.code } inputRef={ this.code_ref } />
                    </l.ListItemText>
                    <l.ListItemMeta icon="content_copy" />
                  </l.ListItem>
                  <l.ListItem key="join-link" disabled>
                    <p>Or have them visit this link:</p>
                  </l.ListItem>
                  <l.ListItem key="join-code-link" onClick={ () => { var range = document.createRange(); range.selectNode(this.link_ref.current); window.getSelection().removeAllRanges();  window.getSelection().addRange(range); document.execCommand("copy"); this.props.snackbar.notify({title: <b>Room invite link copied!</b>, timeout: 3000, dismissesOnAction: true, icon: "info"}); }}>
                    <p><Link ref={ this.link_ref } to={ "/room/members?code=" + this.props.room.code } onClick={ (e) => { e.preventDefault(); } }>{ window.location.origin + "/room/members?code=" + this.props.room.code }</Link></p>
                  </l.ListItem>
        </l.ListGroup>
        { temporary }
              </l.List>
            </div>
          </c.Card>
          <Typography use="headline3">Chat</Typography>
          <c.Card>
            <div style={{ padding: '1rem 1rem 1rem 1rem' }}>
              <l.List>
                <l.ListGroup>
                  { chat }
                </l.ListGroup>
              </l.List>
            </div>
          </c.Card>
          <br />
          <br />
        </article>
      </>;
    }

    if (!this.props.room.admitted) {
      right_panel = <>
        <article key={"joining2"} className="text">
          <Typography use="headline3">Joining</Typography>
          <c.Card>
            <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
              <p>Please wait to be admitted to this room by the moderator.</p>
            </div>
          </c.Card>
        </article>
      </>;
    } else if (this.state.members !== undefined && this.state.members !== null && this.state.members.length > 0) {
      right_panel = <>
        <article key={"members"} className="text">
          <Typography use="headline3">Members</Typography>
          <c.Card>
            <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
              <l.List twoLine>
                <l.ListGroup>
                  <l.ListItem key="users-list" disabled>
                    <b>Users</b>
                  </l.ListItem>
                  { this.state.members.map((member, i) =>
                      member.user
                        ? <l.ListItem key={member.user_id + "-" + member.user.display} disabled>
                            <span className="unselectable">{+i + 1}.&nbsp;</span> {member.user.display}
                            <l.ListItemMeta>
                              <Checkbox checked={member.admitted} label="Admitted" onChange={ () => this.toggleAdmitted(member) } disabled={ !this.state.room_owner } />
                            </l.ListItemMeta>
                          </l.ListItem>
                        : null
                  )}
                </l.ListGroup>
              </l.List>
            </div>
          </c.Card>
        </article>
      </>;
    }

    if (left_panel === null && right_panel === null) {
      return (
        <p>No members currently in the room.</p>
      );
    } else if (left_panel === null) {
      return (
        <div>
          <Helmet>
            <title>Members</title>
          </Helmet>
          <g.Grid fixedColumnWidth={ true }>
            <g.GridCell align="left" span={3} tablet={0} />
            <g.GridCell align="right" span={6} tablet={8}>
              { right_panel }
            </g.GridCell>
          </g.Grid>
        </div>
      );
    } else if (right_panel === null) {
      return (
        <div>
          <Helmet>
            <title>Members</title>
          </Helmet>
          <g.Grid fixedColumnWidth={ true }>
            <g.GridCell align="left" span={3} tablet={0} />
            <g.GridCell align="right" span={6} tablet={8}>
              { left_panel }
            </g.GridCell>
          </g.Grid>
        </div>
      );
    } else {
      return (
        <div>
          <Helmet>
            <title>Members</title>
          </Helmet>
          <g.Grid fixedColumnWidth={ true }>
            <g.GridCell align="left" span={6} tablet={8}>
              { left_panel }
            </g.GridCell>
            <g.GridCell align="right" span={6} tablet={8}>
              { right_panel }
            </g.GridCell>
          </g.Grid>
        </div>
      );
    }
  }
}

export { RoomMembersTab };
