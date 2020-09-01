import React from 'react';

import '@rmwc/card/styles';
import '@rmwc/grid/styles';
import '@rmwc/list/styles';
import '@rmwc/typography/styles';
import '@rmwc/textfield/styles';

import * as c from '@rmwc/card';
import * as g from '@rmwc/grid';
import * as l from '@rmwc/list';
import { Typography } from '@rmwc/typography';
import { TextField } from '@rmwc/textfield';

import { CreateGameForm } from './games.js';


function loadRoom(room) {
  if (!room || !room.endpoint) return null;
  return room;
}

class RoomPage extends React.Component {
  constructor(props) {
    super(props);

    console.log(this.props);

    this.state = {};
    this.room = loadRoom(this.props.room);

    this.code_ref = React.createRef();
    this.link_ref = React.createRef();
  }

  render() {
    return (
      <div className="App-page">
        <Typography use="headline2">Room</Typography>
        <g.Grid fixedColumnWidth={ true }>
          <g.GridCell align="left" span={6}>
            <article className="text">
              <Typography use="headline3">Joining</Typography>
              <c.Card>
                <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
                  <l.List twoLine>
                    <l.ListGroup>
                      <l.ListItem disabled>
                        <p>Share this code to let users join:</p>
                      </l.ListItem>
                      <l.ListItem onClick={() => { this.code_ref.current.select() ; document.execCommand("copy"); this.props.snackbar.notify({title: <b>Game invite code copied!</b>, timeout: 3000, dismissesOnAction: true, icon: "info"}); } }>
                        <l.ListItemText className="App-game-code">
                          <TextField fullwidth readOnly value={ this.room.code } inputRef={ this.code_ref } />
                        </l.ListItemText>
                        <l.ListItemMeta icon="content_copy" />
                      </l.ListItem>
                      <l.ListItem disabled>
                        <p>Or have them visit this link:</p>
                      </l.ListItem>
                      <l.ListItem onClick={ () => { var range = document.createRange(); range.selectNode(this.link_ref.current); window.getSelection().removeAllRanges();  window.getSelection().addRange(range); document.execCommand("copy"); this.props.snackbar.notify({title: <b>Game invite link copied!</b>, timeout: 3000, dismissesOnAction: true, icon: "info"}); }}>
                        <p><a ref={ this.link_ref } href={ window.location.origin + "/?code=" + this.room.code + "#room" }>{ window.location.origin + "/?code=" + this.room.code + "#room" }</a></p>
                      </l.ListItem>
                    </l.ListGroup>
                  </l.List>
                </div>
              </c.Card>
            </article>
          </g.GridCell>
          <g.GridCell align="right" span={6}>
            <Typography use="headline3">Playing</Typography>
            <CreateGameForm {...this.props} />
          </g.GridCell>
        </g.Grid>
      </div>
    );
  }
}

export { RoomPage };
