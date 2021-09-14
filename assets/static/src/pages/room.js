import React from 'react';

import {
  Route,
  Switch,
} from "react-router-dom";

import { Icon } from '@rmwc/icon';
import '@rmwc/icon/styles';
import * as t from '@rmwc/tabs';
import '@rmwc/tabs/styles';
import { Typography } from '@rmwc/typography';
import '@rmwc/typography/styles';
import { ThemeProvider } from '@rmwc/theme';
import '@rmwc/theme/styles';

import '../App.css';

import { RoomArchiveTab } from './room/archive.js';
import { RoomGamesTab } from './room/games.js';
import { RoomMembersTab } from './room/members.js';
import { killable, GamePage } from './games.js';

class RoomInnerPage extends React.Component {
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
          <Route path="/room/members">
            <RoomMembersTab {...this.props} />
          </Route>
          <Route path="/room/games">
            <RoomGamesTab {...this.props} />
          </Route>
          <Route path="/room/archive">
            <RoomArchiveTab {...this.props} />
          </Route>
          <Route>
            <RoomGamesTab {...this.props} />
          </Route>
        </Switch>
      </div>
    );
  }
}

class RoomPage extends React.Component {
  render() {
    return (
      <Switch>
        <Route path="/room/game/:id">
          <GamePage {...this.props} />
        </Route>
        <Route>
          <RoomInnerPage {...this.props} />
        </Route>
      </Switch>
    );
  }
}

export { RoomPage };
