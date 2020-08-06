import React from 'react';

import './App.css';
import 'rmwc/dist/styles';
import '@rmwc/icon/styles';

import { AboutPage } from './pages/about.js';
import { ErrorPage } from './pages/common.js';
import { Footer } from './pages/footer.js';
import { AfterPartyPage, CreateGamePage, JoinGamePage, PreGamePage, RushGamePage } from './pages/games.js';
import { HomePage } from './pages/home.js';
import { LoginPage } from './pages/login.js';
import { ProfilePage } from './pages/profile.js';
import { SignupPage } from './pages/signup.js';

class Page extends React.Component {
  render() {
    var component = ErrorPage;
    switch (this.props.page) {
      case 'home': component = HomePage; break;
      case 'about': component = AboutPage; break;
      case 'login': component = LoginPage; break;
      case 'profile': component = ProfilePage; break;
      case 'signup': component = SignupPage; break;
      case 'create': component = this.props.user ? CreateGamePage : LoginPage; break;
      case 'playing': component = this.props.game ? RushGamePage : JoinGamePage; break;
      case 'play': component = this.props.game ? PreGamePage : JoinGamePage; break;
      case 'afterparty': component = this.props.game ? AfterPartyPage : JoinGamePage; break;
      case 'join': component = JoinGamePage; break;
      default: component = ErrorPage;
    }
    return React.createElement(component, this.props, this.props.children);
  }
}

export { Page, Footer };
