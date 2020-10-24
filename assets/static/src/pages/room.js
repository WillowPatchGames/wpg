import React from 'react';

import {
  Link,
} from "react-router-dom";

import '@rmwc/button/styles';
import '@rmwc/card/styles';
import '@rmwc/checkbox/styles';
import '@rmwc/grid/styles';
import '@rmwc/list/styles';
import '@rmwc/typography/styles';
import '@rmwc/textfield/styles';

import { Button } from '@rmwc/button';
import { Checkbox } from '@rmwc/checkbox';
import * as c from '@rmwc/card';
import * as g from '@rmwc/grid';
import * as l from '@rmwc/list';
import { Typography } from '@rmwc/typography';
import { TextField } from '@rmwc/textfield';

import { killable, CreateGameForm, PreGamePage } from './games.js';
import { GameCache } from '../utils/cache.js';

class RoomPage extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      pending: null,
      playing: null,

      timeout: killable(() => { this.checkForGames() }, 5000),
      dummy: null,
      members: this.props.room.members,
      create_game_form: false,
      room_owner: +this.props.user.id === +this.props.room.owner,
    };

    this.code_ref = React.createRef();
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
    this.props.room.games = null;
    await this.props.room.update();

    if (this.props.room.games) {
      if (this.props.room.games.pending) {
        var pending = [];
        for (let game_id of this.props.room.games.pending) {
          let game = await GameCache.FromId(this.props.user, game_id);

          if (game.error === null) {
            pending.push(game);
          } else {
            console.log(game);
          }
        }

        this.setState(state => Object.assign({}, state, { pending }));
      } else {
        this.setState(state => Object.assign({}, state, { pending: null }));
      }

      if (this.props.room.games.playing) {
        var playing = [];
        for (let game_id of this.props.room.games.playing) {
          let game = await GameCache.FromId(this.props.user, game_id);

          if (game.error === null && game.admitted) {
            playing.push(game);
          } else {
            console.log(game);
          }
        }

        this.setState(state => Object.assign({}, state, { playing }));
      } else {
        this.setState(state => Object.assign({}, state, { playing: null }));
      }
    } else {
      this.setState(state => Object.assign({}, state, { pending: null, playing: null }));
    }

    this.setState(state => Object.assign({}, state, { members: this.props.room.members }));
  }

  async joinGame(game) {
    await game.update();
    if (game.error !== null) {
      console.log(game);
    } else {
      this.props.setGame(game);
    }
  }

  clearGame() {
    if (this.props.game !== null) {
      if (this.props.game.interface) {
        this.props.game.interface.close();
      }

      this.props.game.interface = null;
      this.props.setGame(null);
    }
  }

  async deleteGame(game) {
    await game.delete();
    this.props.setGame(null);
    this.setState(state => Object.assign({}, state, { pending: null }));

    if (game.error !== null) {
      console.log(game);
    } else {
      this.checkForGames();
    }
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

  setCreateGameForm(new_state) {
    this.setState(state => Object.assign({}, state, { create_game_form: new_state }));
  }

  render() {
    let left_panel = [];
    if (this.state.room_owner) {
      left_panel.push(
        <article className="text">
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
                    <p><Link ref={ this.link_ref } to={ "/room?code=" + this.props.room.code }>{ window.location.origin + "/room?code=" + this.props.room.code }</Link></p>
                  </l.ListItem>
                </l.ListGroup>
              </l.List>
            </div>
          </c.Card>
          <br />
          <br />
        </article>
      );
    }

    if (!this.props.room.admitted) {
      left_panel.push(
        <article className="text">
          <Typography use="headline3">Joining</Typography>
          <c.Card>
            <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
              <p>Please wait to be admitted to this room by the moderator.</p>
            </div>
          </c.Card>
        </article>
      );
    } else if (this.state.members !== undefined && this.state.members !== null && this.state.members.length > 0) {
      left_panel.push(
        <article className="text">
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
      );
    }

    let right_panel = null;
    if (this.state.room_owner && this.state.create_game_form) {
      right_panel = <CreateGameForm {...this.props} callback={ () => this.setCreateGameForm(false) } />;
    } else if (this.props.game === null) {
        var playing = [];
        if (this.state.playing !== null) {
          for (let game of this.state.playing) {
            playing.push(
              <>
                <br />
                <c.Card>
                  <div style={{ padding: '1rem 1rem 1rem 1rem' }}>
                    Game #{ game.id }
                  </div>
                  <c.CardActions>
                    <c.CardActionButton theme="secondary" onClick={ () => this.joinGame(game) }>
                      Resume
                    </c.CardActionButton>
                    {
                      this.state.room_owner ?
                      <c.CardActionButton theme="secondary" onClick={ () => this.deleteGame(game) }>
                        Delete
                      </c.CardActionButton>
                      : <></>
                    }
                  </c.CardActions>
                </c.Card>
              </>
            );
          }
        }

        var pending = [];
        if (this.state.pending !== null) {
          for (let game of this.state.pending) {
            pending.push(
              <>
                <br />
                <c.Card>
                  <div style={{ padding: '1rem 1rem 1rem 1rem' }}>
                    Game #{ game.id }
                  </div>
                  <c.CardActions>
                    <c.CardActionButton theme="secondary" onClick={ () => this.joinGame(game) }>
                      Play
                    </c.CardActionButton>
                    {
                      this.state.room_owner ?
                      <c.CardActionButton theme="secondary" onClick={ () => this.deleteGame(game) }>
                        Delete
                      </c.CardActionButton>
                      : <></>
                    }
                  </c.CardActions>
                </c.Card>
              </>
            );
          }
        }

        right_panel = <>
          {
            playing.length > 0
            ? <div>
                <Typography use="headline4">In Progress</Typography>
                { playing }
              </div>
            : null
          }
          {
            pending.length > 0
            ? <div>
                <Typography use="headline4">Open to Join</Typography>
                { pending}
              </div>
            : null
          }
        </>
    } else {
      right_panel = <PreGamePage {...this.props} />;
    }

    return (
      <div className="App-page">
        <Typography use="headline2">Room</Typography>
        <g.Grid fixedColumnWidth={ true }>
          <g.GridCell align="left" span={6}>
            { left_panel }
          </g.GridCell>
          <g.GridCell align="right" span={6}>
            <Typography use="headline3">Playing</Typography>
            <Button label="Refresh Games" raised onClick={() => { this.setCreateGameForm(false) ; this.clearGame() ; this.state.timeout.exec() } } />
            {
              this.state.room_owner
              ? <Button label="Create Game" raised onClick={() => this.setCreateGameForm(true) } />
              : null
            }
            <br /><br />
            { right_panel }
          </g.GridCell>
        </g.Grid>
      </div>
    );
  }
}

export { RoomPage };
