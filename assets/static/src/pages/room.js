import React from 'react';

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
import { GameModel } from '../models.js';

class RoomPage extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      game_choices: null,
      timeout: killable(() => { this.checkForGames() }, 5000),
      dummy: null,
      members: this.props.room.members,
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
      var games = [];
      for (var game_index in this.props.room.games) {
        var game_id = this.props.room.games[game_index];
        var game = await GameModel.FromId(this.props.user, game_id);

        if (game.error === null) {
          games.push(game);
        } else {
          console.log(game);
        }
      }

      this.setState(state => Object.assign({}, state, { game_choices: games }));
    } else {
      this.setState(state => Object.assign({}, state, { game_choices: null }));
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

  async deleteGame(game) {
    await game.delete();
    this.props.setGame(null);
    this.setState(state => Object.assign({}, state, { game_choices: null }));

    if (game.error !== null) {
      console.log(game);
    } else {
      this.checkForGames();
    }
  }

  async toggleAdmitted(member) {
    if (this.props.user.id !== this.props.room.owner || member.user_id === this.props.room.owner) {
      return;
    }

    member.admitted = !member.admitted;
    this.setState(state => Object.assign({}, state));
    await this.props.room.admitPlayer(member.user_id, member.admitted, member.banned);
    this.setState(state => Object.assign({}, state, { members: this.props.room.members }));
  }

  render() {
    let left_panel = [];
    if (this.props.user.id === this.props.room.owner) {
      left_panel.push(
        <article className="text">
          <Typography use="headline3">Joining</Typography>
          <c.Card>
            <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
              <l.List twoLine>
                <l.ListGroup>
                  <l.ListItem disabled>
                    <p>Share this code to let users join:</p>
                  </l.ListItem>
                  <l.ListItem onClick={() => { this.code_ref.current.select() ; document.execCommand("copy"); this.props.snackbar.notify({title: <b>Room invite code copied!</b>, timeout: 3000, dismissesOnAction: true, icon: "info"}); } }>
                    <l.ListItemText className="App-game-code">
                      <TextField fullwidth readOnly value={ this.props.room.code } inputRef={ this.code_ref } />
                    </l.ListItemText>
                    <l.ListItemMeta icon="content_copy" />
                  </l.ListItem>
                  <l.ListItem disabled>
                    <p>Or have them visit this link:</p>
                  </l.ListItem>
                  <l.ListItem onClick={ () => { var range = document.createRange(); range.selectNode(this.link_ref.current); window.getSelection().removeAllRanges();  window.getSelection().addRange(range); document.execCommand("copy"); this.props.snackbar.notify({title: <b>Room invite link copied!</b>, timeout: 3000, dismissesOnAction: true, icon: "info"}); }}>
                    <p><a ref={ this.link_ref } href={ window.location.origin + "/?code=" + this.props.room.code + "#room" }>{ window.location.origin + "/?code=" + this.props.room.code + "#room" }</a></p>
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
                  <l.ListItem disabled>
                    <b>Users</b>
                  </l.ListItem>
                  { this.state.members.map((member, i) =>
                      member.user
                        ? <l.ListItem key={member.user.display} disabled>
                          <span className="unselectable">{+i + 1}.&nbsp;</span> {member.user.display}
                          <l.ListItemMeta>
                            <Checkbox checked={member.admitted} label="Admitted" onChange={ () => this.toggleAdmitted(member) } disabled={ this.props.user.id !== this.props.room.owner } />
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
    if (this.props.game === null) {
      if (this.props.user.id === this.props.room.owner && this.state.game_choices === null) {
        right_panel = <CreateGameForm {...this.props} />;
      } else {
        var games = [];

        if (this.state.game_choices !== null) {
          for (let index in this.state.game_choices) {
            let game = this.state.game_choices[index];
            games.push(
              <c.Card>
                <div style={{ padding: '1rem 1rem 1rem 1rem' }}>
                  Game #{ game.id }
                </div>
                <c.CardActions>
                  <c.CardActionButton theme="secondary" onClick={ () => this.joinGame(game) }>
                    Play
                  </c.CardActionButton>
                  {
                    this.props.user.id === this.props.room.owner ?
                    <c.CardActionButton theme="secondary" onClick={ () => this.deleteGame(game) }>
                      Delete
                    </c.CardActionButton>
                    : <></>
                  }
                </c.CardActions>
              </c.Card>
            );
          }
        }

        right_panel = <>
          <Button label="Refresh Games" raised onClick={() => this.state.timeout.exec() } />
          <br /><br />
          {
            games ? <div>{ games }</div> : <></>
          }
        </>
      }
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
            { right_panel }
          </g.GridCell>
        </g.Grid>
      </div>
    );
  }
}

export { RoomPage };
