// Library imports
import React from 'react';

import { Button } from '@rmwc/button';
import '@rmwc/button/styles';
import * as c from '@rmwc/card';
import '@rmwc/card/styles';
import * as d from '@rmwc/dialog';
import '@rmwc/dialog/styles';
import * as l from '@rmwc/list';
import '@rmwc/list/styles';
/*import { Select } from '@rmwc/select';
import '@rmwc/select/styles';*/
import { Switch } from '@rmwc/switch';
import '@rmwc/switch/styles';
import { TextField } from '@rmwc/textfield';
import '@rmwc/textfield/styles';

// Application imports
import '../../App.css';
import { RoomModel } from '../../models.js';

class CreateRoomForm extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      error: null,
      mode: 'dynamic',
      open: true,
      video_chat: '',
    }
  }

  async handleSubmit(event) {
    event.preventDefault();

    if (this.props.user === null || !this.props.user.authed) {
      this.setError("Need to have a user account before doing this action!");
      return;
    }

    var room = new RoomModel(this.props.user);
    room.mode = this.state.mode;
    room.open = this.state.open;
    room.config = {};
    room.config.video_chat = this.state.video_chat;

    await room.create();

    if (room.error !== null) {
      this.setError(room.error.message);
    } else {
      this.props.setRoom(room);
      this.props.setGame(null);
      this.props.setPage('room', '?code=' + room.code);
    }
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

  toggle(name) {
    this.newState(state => ({ [name]: !state[name] }));
  }

  setError(message) {
    this.setState(state => Object.assign({}, state, { error: message }));
  }

  render() {
    return (
      <c.Card>
        <div style={{ padding: '1rem 1rem 1rem 1rem' }} >

          <form onSubmit={ this.handleSubmit.bind(this) }>
            <l.List twoLine>
              <l.ListGroup>
                <l.ListGroupSubheader>Joining Options</l.ListGroupSubheader>
                <l.ListItem onClick={(e) => e.target === e.currentTarget && this.toggle("open") }><Switch label={ this.state.open ? "Open for anyone to join if they have the room code" : "Generate unique invite codes for every player" } checked={ this.state.open } onChange={ () => this.toggle("open", true) } /></l.ListItem>
                <TextField fullwidth label="Video Chat Link" value={ this.state.video_chat } onChange={ this.inputHandler("video_chat") } />
              </l.ListGroup>
              <br />
              <br />
              {/*
                <l.ListGroup>
                  <l.ListGroupSubheader>Game Options</l.ListGroupSubheader>
                  <Select label="Game Mode" enhanced value={ this.state.mode } onChange={ this.inputHandler("mode") } options={
                    [
                      {
                        label: 'Single (Only one game)',
                        value: 'single',
                      },
                      {
                        label: 'Dynamic (Play multiple types of games)',
                        value: 'dynamic',
                      }
                    ]
                  } />
                  <br/>
                </l.ListGroup>
              */}
            </l.List>

            <Button label="Create" raised />
          </form>
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

export { CreateRoomForm };
