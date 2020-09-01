import React from 'react';

import './App.css';
import '@rmwc/icon/styles';

import { AboutPage } from './pages/about.js';
import { DocsPage } from './pages/docs.js';
import { ErrorPage } from './pages/common.js';
import { Footer } from './pages/footer.js';
import { AfterPartyPage, CreateGamePage, CreateRoomPage, JoinGamePage, PreGamePage, RushGamePage } from './pages/games.js';
import { HomePage } from './pages/home.js';
import { LoginPage } from './pages/login.js';
import { ProfilePage } from './pages/profile.js';
import { RoomPage } from './pages/room.js';
import { RushRulesPage } from './pages/rules.js';
import { SignupPage } from './pages/signup.js';

class Page extends React.Component {
  render() {
    return React.createElement(this.getPage(), this.props, this.props.children);
  }
  componentDidUpdate() {
    this.props.setImmersive(this.getPage().immersive);
  }
  getPage() {
    var component = ErrorPage;
    switch (this.props.page) {
      case 'home': component = HomePage; break;
      case 'about': component = AboutPage; break;
      case 'login': component = LoginPage; break;
      case 'profile': component = ProfilePage; break;
      case 'signup': component = SignupPage; break;
      case 'create-game': component = this.props.user ? CreateGamePage : LoginPage; break;
      case 'create-room': component = this.props.user ? CreateRoomPage : LoginPage; break;
      case 'playing': component = this.props.game ? RushGamePage : JoinGamePage; break;
      case 'play': component = this.props.game ? PreGamePage : JoinGamePage; break;
      case 'afterparty': component = this.props.game ? AfterPartyPage : JoinGamePage; break;
      case 'join': component = JoinGamePage; break;
      case 'rush-rules': component = RushRulesPage; break;
      case 'docs': component = DocsPage; break;
      case 'room': component = RoomPage; break;
      default: component = ErrorPage;
    }
    return component;
  }
}

export { Page, Footer };
