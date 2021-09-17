import React from 'react';

import { Helmet } from "react-helmet";

import { Button } from '@rmwc/button';
import '@rmwc/button/styles';
import * as c from '@rmwc/card';
import '@rmwc/card/styles';
import * as g from '@rmwc/grid';
import '@rmwc/grid/styles';
import { Typography } from '@rmwc/typography';
import '@rmwc/typography/styles';

import '../../App.css';

import { killable, CreateGameForm, PreGamePage } from '../games.js';
import { GameCache } from '../../utils/cache.js';

class RoomGamesTab extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      pending: null,
      playing: null,

      timeout: killable(() => { this.checkForGames() }, 5000),
      dummy: null,
      create_game_form: false,
      room_owner: +this.props.user.id === +this.props.room.owner,
    };

    this.code_ref = React.createRef();
    this.link_ref = React.createRef();

    if (this.props.game !== null && this.props.game.lifecycle !== "pending") {
      this.clearGame();
    }
  }

  componentDidMount() {
    this.state.timeout.exec();

    // Fix bug: when switching from the games tab to the members/archive tab
    // and then back to the games tab, the game should still be active.
    // However, because the component unmounted and remounted, we need to get
    // back all the state we lost (of which players were in which state). So
    // re-send the join message. :-)
    if (this.props.game?.interface) {
      this.props.game.interface.controller.wsController.send({"message_type": "join"});
    }
  }

  componentWillUnmount() {
    if (this.state.timeout) {
      this.state.timeout.kill();
    }
  }

  async checkForGames() {
    let was_admitted = this.props.room.admitted;
    let old_code = this.props.room.code;

    // XXX: Convert to WebSocket
    await this.props.room.update();

    if (!was_admitted && this.props.room.admitted) {
      // Just changed from not admitted to admitted. Check if we joined via
      // a temporary join code and switch to the full join code.
      if (old_code.substr(0, 3) === 'rt-' && this.props.room.code !== old_code) {
        this.props.setPage('/room/games', '?code=' + this.props.room.code);
      }
    }

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
  }

  async joinGame(game) {
    await game.update();
    if (game.error !== null) {
      console.log(game);
    } else {
      this.props.setGame(game);
      if (this.props.game.lifecycle !== "pending") {
        this.props.setPage("/room/game/" + game.id, true);
      }
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

  setCreateGameForm(new_state) {
    this.setState(state => Object.assign({}, state, { create_game_form: new_state }));
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

  render() {
    let left_panel = null;
    let right_panel = null;
    var tab_title = "Games";

    if (this.state.room_owner && this.state.create_game_form) {
      left_panel = <>
        <Typography use="headline4">Create a Game</Typography>
        <CreateGameForm {...this.props} callback={ () => this.setCreateGameForm(false) } />
      </>;
    }

    if (this.props.game === null) {
      var playing = [];
      if (this.state.playing !== null) {
        for (let game of this.state.playing) {
          playing.push(
            <div key={ game.id }>
              <br />
              <c.Card>
                <div style={{ padding: '1rem 1rem 1rem 1rem' }}>
                  Game #{ game.id } - { game.style }
                </div>
                <c.CardActions style={{ justifyContent: "center" }}>
                  <c.CardActionButton theme={['secondaryBg', 'onSecondary']} raised onClick={ () => this.joinGame(game) }>
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
            </div>
          );
        }
      }

      var pending = [];
      if (this.state.pending !== null) {
        for (let game of this.state.pending) {
          pending.push(
            <div key={ game.id }>
              <br />
              <c.Card>
                <div style={{ padding: '1rem 1rem 1rem 1rem' }}>
                  Game #{ game.id } - { game.style }
                </div>
                <c.CardActions style={{ justifyContent: "center" }}>
                  <c.CardActionButton theme={['secondaryBg', 'onSecondary']} raised onClick={ () => this.joinGame(game) }>
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
            </div>
          );
        }
      }

      if (playing.length > 0 || pending.length > 0) {
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
                { pending }
              </div>
            : null
          }
        </>
      }
    } else if (this.props.game.lifecycle === "pending") {
      right_panel = <PreGamePage {...this.props} />;
      tab_title = "Game #" + this.props.game.id;
    }

    if (left_panel === null && right_panel === null) {
      return (
        <>
          <Helmet>
            <title>{ tab_title }</title>
          </Helmet>
          <Typography use="headline3">Playing</Typography>
          <Button label="Refresh Games" raised onClick={() => { this.setCreateGameForm(false) ; this.clearGame() ; this.state.timeout.exec() } } />
          {
            this.state.room_owner
            ? <>&nbsp;&nbsp;<Button label="Create Game" raised onClick={() => this.setCreateGameForm(true) } /></>
            : null
          }
          <br /><br />
          <p>No games currently in the room.</p>
        </>
      );
    } else if (left_panel === null) {
      return (
        <div>
          <Helmet>
          <title>{ tab_title }</title>
          </Helmet>
          <g.Grid fixedColumnWidth={ true }>
            <g.GridCell align="left" span={2} tablet={0} />
            <g.GridCell align="right" span={8} tablet={8}>
              <Typography use="headline3">Playing</Typography>
              <Button label="Refresh Games" raised onClick={() => { this.setCreateGameForm(false) ; this.clearGame() ; this.state.timeout.exec() } } />
              {
                this.state.room_owner
                ? <>&nbsp;&nbsp;<Button label="Create Game" raised onClick={() => this.setCreateGameForm(true) } /></>
                : null
              }
              <br /><br />
              { right_panel }
            </g.GridCell>
          </g.Grid>
        </div>
      );
    } else if (right_panel === null) {
      return (
        <div>
          <Helmet>
            <title>{ tab_title }</title>
          </Helmet>
          <g.Grid fixedColumnWidth={ true }>
            <g.GridCell align="left" span={2} tablet={0} />
            <g.GridCell align="right" span={8} tablet={8}>
              <Typography use="headline3">Playing</Typography>
              <Button label="Refresh Games" raised onClick={() => { this.setCreateGameForm(false) ; this.clearGame() ; this.state.timeout.exec() } } />
              {
                this.state.room_owner
                ? <>&nbsp;&nbsp;<Button label="Create Game" raised onClick={() => this.setCreateGameForm(true) } /></>
                : null
              }
              <br /><br />
              { left_panel }
            </g.GridCell>
          </g.Grid>
        </div>
      );
    } else {
      return (
        <div>
          <Helmet>
            <title>{ tab_title }</title>
          </Helmet>
          <g.Grid fixedColumnWidth={ true }>
            <g.GridCell align="left" span={6} tablet={8}>
              <Typography use="headline3">Playing</Typography>
              <Button label="Refresh Games" raised onClick={() => { this.setCreateGameForm(false) ; this.clearGame() ; this.state.timeout.exec() } } />
              {
                this.state.room_owner
                ? <>&nbsp;&nbsp;<Button label="Create Game" raised onClick={() => this.setCreateGameForm(true) } /></>
                : null
              }
              <br /><br />
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

export { RoomGamesTab };
