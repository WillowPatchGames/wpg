import React from 'react';

import '@rmwc/button/styles';
import '@rmwc/card/styles';
import '@rmwc/grid/styles';
import '@rmwc/icon/styles';
import '@rmwc/list/styles';
import '@rmwc/typography/styles';
import '@rmwc/textfield/styles';

import { Button } from '@rmwc/button';
import * as c from '@rmwc/card';
import * as g from '@rmwc/grid';
import { Icon } from '@rmwc/icon';
import * as l from '@rmwc/list';
import { Typography } from '@rmwc/typography';
import { TextField } from '@rmwc/textfield';

import { CreateGameForm, PreGamePage, loadGame } from './games.js';
import { GameModel } from '../models.js';


function loadRoom(room) {
  if (!room || !room.endpoint) return null;
  return room;
}

class RoomPage extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      game_choices: null
    };

    this.code_ref = React.createRef();
    this.link_ref = React.createRef();
  }

  componentDidMount() {
    this.checkForGames();
  }

  async checkForGames() {
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
    if (game.error !== null) {
      console.log(game);
    } else {
      this.checkForGames();
    }
  }

  render() {
    let right_panel = null;
    if (this.props.game === null) {
      if (this.props.user.id === this.props.room.owner && this.state.game_choices === null) {
        right_panel = <CreateGameForm {...this.props} />;
      } else {
        var games = [];

        if (this.state.game_choices !== null) {
          for (var index in this.state.game_choices) {
            var game = this.state.game_choices[index];
            games.push(
              <c.Card>
                <div style={{ padding: '1rem 1rem 1rem 1rem' }}>
                  Game #{ game.id }
                </div>
                <c.CardActions>
                  <c.CardActionButton onClick={ () => this.joinGame(game) }>
                    Play
                  </c.CardActionButton>
                  {
                    this.props.user.id === this.props.room.owner ?
                    <c.CardActionButton onClick={ () => this.deleteGame(game) }>
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
          <Button label="Refresh Games" raised onClick={() => this.checkForGames() } />
          <br /><br />
          {
            games ? <div>{ games }</div> : <></>
          }
        </>
      }
    } else {
      console.log("There's already a game!");
      right_panel = <PreGamePage {...this.props} />;
    }

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
            </article>
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
