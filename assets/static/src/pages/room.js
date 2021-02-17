import React from 'react';

import {
  Route,
  Switch,
  Link,
} from "react-router-dom";

import { Helmet } from "react-helmet";

import '@rmwc/button/styles';
import '@rmwc/card/styles';
import '@rmwc/checkbox/styles';
import '@rmwc/grid/styles';
import '@rmwc/icon/styles';
import '@rmwc/list/styles';
import '@rmwc/select/styles';
import '@rmwc/tabs/styles';
import '@rmwc/typography/styles';
import '@rmwc/textfield/styles';
import '@rmwc/theme/styles';

import { Button } from '@rmwc/button';
import { Checkbox } from '@rmwc/checkbox';
import * as c from '@rmwc/card';
import * as g from '@rmwc/grid';
import { Icon } from '@rmwc/icon';
import * as l from '@rmwc/list';
import { Select } from '@rmwc/select';
import * as t from '@rmwc/tabs';
import { Typography } from '@rmwc/typography';
import { TextField } from '@rmwc/textfield';
import { ThemeProvider } from '@rmwc/theme';

import { killable, CreateGameForm, PreGamePage } from './games.js';
import { GameCache } from '../utils/cache.js';

import { formatDistanceToNow } from 'date-fns';

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
                    <p><Link ref={ this.link_ref } to={ "/room?code=" + this.props.room.code }>{ window.location.origin + "/room?code=" + this.props.room.code }</Link></p>
                  </l.ListItem>
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
    } else {
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

class RoomArchiveTab extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      games: null,
      game_lifecycle: "any",
    }
  }

  async componentDidMount() {
    await this.reloadArchive();
  }

  async reloadArchive() {
    var games = await this.props.user.gameSearch(this.state.game_lifecycle, this.props.room.id);
    if (games !== null && games.length === 0) {
      games = null;
    }

    this.setState(state => Object.assign({}, state, { games }));
  }

  async handleDeleteGame(game) {
    await game.delete();
    await this.reloadArchive();
  }

  async handleJoinGame(game) {
    this.props.setGame(game);
    this.props.setRoom(this.props.room);

    if (game.lifecycle === 'finished') {
      this.props.setPage('/afterparty', true);
    } else if (game.lifecycle === 'playing') {
      this.props.setPage('/playing', true);
    } else {
      this.props.setPage('/room/games', true);
    }
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

    if (this.state.games && !this.state.games.error) {
      var loaded_games = [];
      for (let game of this.state.games) {
        loaded_games.push(
          <l.ListItem>
            <l.ListItemText className="double-info">
              <l.ListItemPrimaryText style={{ "textAlign": "left" }}>
                <b>Game #{ game.game_id }</b>&nbsp;-&nbsp;{ game.style }&nbsp;-&nbsp;<i>{ game.lifecycle }</i>
              </l.ListItemPrimaryText>
              <l.ListItemSecondaryText>
                <span title={ game.created_at } style={{ color: "#000" }}>Created { formatDistanceToNow(new Date(game.created_at)) } ago</span>
                <span className="info-spacer"></span>
                <span title={ game.updated_at } style={{ color: "#000" }}>Updated { formatDistanceToNow(new Date(game.updated_at)) } ago</span>
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
                game.lifecycle !== "deleted" && game.lifecycle !== "finished" && game.lifecycle !== "expired"
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
                <l.SimpleListItem text={ <b>Games in room #{ this.props.room.id }</b> } metaIcon="chevron_right" />
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

    return (
      <div>
        <Helmet>
          <title>Archive</title>
        </Helmet>
        <Typography use="headline3">Archive</Typography>
        <div>
          <g.Grid fixedColumnWidth={ true }>
            <g.GridCell align="left" span={6} tablet={8}>
              <Typography use="headline4">Filter</Typography>
              <div style={{ padding: '0.5rem 0rem 0.5rem 0rem' }} >
                <c.Card>
                  <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
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
                  </div>
                </c.Card>
              </div>
            </g.GridCell>
            <g.GridCell align="right" span={6} tablet={8}>
              <Typography use="headline4">Results</Typography>
              { games }
            </g.GridCell>
          </g.Grid>
        </div>
      </div>
    );
  }
}

class RoomPage extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      not_admitted: 0,
      room_owner: +this.props.user.id === +this.props.room.owner,
      timeout: killable(() => { this.checkForUnadmitted() }, 5000),
    };
  }

  componentDidMount() {
    this.state.timeout.exec();
  }

  componentWillUnmount() {
    if (this.state.timeout) {
      this.state.timeout.kill();
    }
  }

  async checkForUnadmitted() {
    if (this.state.room_owner && this.props.room.members) {
      await this.props.room.update();

      var not_admitted = 0;
      for (let member of this.props.room.members) {
        if (!member.admitted) {
          not_admitted += 1;
        }
      }

      this.setState(state => Object.assign({}, state, { not_admitted }));
    } else if (!this.state.room_owner) {
      this.state.timeout.kill();
    }
  }

  render() {
    var paths = ['/room/games', '/room/members', '/room/archive'];
    var tab_index = paths.indexOf(window.location.pathname);
    if (tab_index === -1) {
      tab_index = 0;
    }

    var chat = null;
    if (this.props.room.config.video_chat !== undefined && this.props.room.config.video_chat !== null && this.props.room.config.video_chat.length > 0) {
      chat = <>
        <a href={ this.props.room.config.video_chat } target="_blank" rel="noopener noreferrer">
          <Icon icon={{
              icon: "voice_chat",
              size: "xlarge",
            }}
          />
        </a>
      </>;
    }

    var members_label = "Members";
    if (this.state.not_admitted > 0) {
      members_label += " (" + this.state.not_admitted + ")";
    }

    return (
      <div className="App-page">
        <Typography use="headline2">Room #{ this.props.room.id }{ chat }</Typography>
        <div style={{ width: "65%", margin: "0 auto" }}>
          <ThemeProvider
            options={{
              primary: '#006515', // Dark Green -- Theme's secondary
              onPrimary: 'black',
              primaryBg: 'white',
            }}
          >
            <t.TabBar activeTabIndex={ tab_index }>
              <t.Tab icon="games" label="Games" onClick={ () => this.props.setPage('/room/games', true) } />
              <t.Tab icon="groups" label={ members_label } onClick={ () => this.props.setPage('/room/members', true) } />
              <t.Tab icon="archive" label="Archive" onClick={ () => this.props.setPage('/room/archive', true) } />
            </t.TabBar>
          </ThemeProvider>
        </div>
        <br />
        <Switch>
          <Route exact path="/room">
            <RoomGamesTab {...this.props} />
          </Route>
          <Route path="/room/members">
            <RoomMembersTab {...this.props} />
          </Route>
          <Route path="/room/games">
            <RoomGamesTab {...this.props} />
          </Route>
          <Route path="/room/archive">
            <RoomArchiveTab {...this.props} />
          </Route>
        </Switch>
      </div>
    );
  }
}

export { RoomPage };
