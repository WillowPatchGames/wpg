import React from 'react';

import './App.css';

import {
  Route,
  Switch,
} from "react-router-dom";

import { AboutPage } from './pages/about.js';
import { NotFoundPage } from './pages/common.js';
import { DocsPage } from './pages/docs.js';
import { Footer } from './pages/footer.js';
import { AfterPartyPage, CreateGamePage, CreateRoomPage, JoinGamePage, PreGamePage, GamePage } from './pages/games.js';
import { HomePage } from './pages/home.js';
import { LoginPage } from './pages/login.js';
import { ProfilePage } from './pages/profile.js';
import { RoomPage } from './pages/room.js';
import { RushRulesPage } from './pages/rules.js';
import { SignupPage } from './pages/signup.js';
import { PricingPage } from './pages/pricing.js';
import { PrivacyPage } from './pages/privacy.js';
import { TestGamePage } from './pages/test.js';
import { DemoGamePage } from './pages/demo.js';

class RouteWithAuth extends React.Component {
  render() {
    var child = this.props.children[1];
    if (this.props.user && this.props.user.authed) {
      child = this.props.children[0];
    }

    return (
      <Route path={ this.props.path } render={ () => child } />
    )
  }
}

class RouteWithGame extends React.Component {
  render() {
    var child = this.props.children[1];
    if (this.props.game) {
      child = this.props.children[0];
    }

    return (
      <Route path={ this.props.path } render={ () => child } />
    )
  }
}

class RouteWithRoom extends React.Component {
  render() {
    var child = this.props.children[1];
    if (this.props.room) {
      child = this.props.children[0];
    }

    return (
      <Route path={ this.props.path } render={ () => child } />
    )
  }
}

class Page extends React.Component {
  render() {
    var this_props = Object.assign({}, this.props, { location: undefined });

    return (
      <Switch>
        <Route exact path="/about">
          <AboutPage {...this_props} key="path-about" />
        </Route>
        <RouteWithGame path="/afterparty" game={ this.props.game }>
          <AfterPartyPage {...this_props} key="path-afterparty" />
          <JoinGamePage {...this_props} key="path-afterparty-missing" />
        </RouteWithGame>
        <RouteWithAuth path="/create/game" user={ this.props.user }>
          <CreateGamePage {...this_props} key="path-create-game" />
          <LoginPage {...this_props} key="path-create-game-unauthed" />
        </RouteWithAuth>
        <RouteWithAuth path="/create/room" user={ this.props.user }>
          <CreateRoomPage {...this_props} key="path-create-room" />
          <LoginPage {...this_props} key="path-create-room-unauthed" />
        </RouteWithAuth>
        <Route path="/docs">
          <DocsPage {...this_props} key="path-docs" />
        </Route>
        <Route path="/join">
          <JoinGamePage {...this_props} key="path-join" />
        </Route>
        <Route path="/login">
          <LoginPage {...this_props} key="path-login" />
        </Route>
        <RouteWithGame path="/play" game={ this.props.game }>
          <PreGamePage {...this_props} key="path-play" />
          <JoinGamePage {...this_props} key="path-play-missing" />
        </RouteWithGame>
        <RouteWithGame path="/playing" game={ this.props.game }>
          <GamePage {...this_props} key="path-playing" />
          <JoinGamePage {...this_props} key="path-playing-missing" />
        </RouteWithGame>
        <Route path="/pricing">
          <PricingPage {...this_props} key="path-pricing" />
        </Route>
        <Route path="/privacy">
          <PrivacyPage {...this_props} key="path-privacy" />
        </Route>
        <RouteWithAuth path="/profile" user={ this.props.user }>
          <ProfilePage {...this_props} key="path-profile" />
          <LoginPage {...this_props} key="path-profile-unauthed" />
        </RouteWithAuth>
        <RouteWithRoom path="/room" room={ this.props.room }>
          <RoomPage {...this_props} key="path-room" />
          <JoinGamePage {...this_props} key="path-room-missing" />
        </RouteWithRoom>
        <Route path="/rules/rush">
          <RushRulesPage {...this_props} key="path-rules-rush" />
        </Route>
        <Route path="/signup">
          <SignupPage {...this_props} key="path-signup" />
        </Route>
        <Route path="/home">
          <HomePage {...this_props} key="path-home" />
        </Route>
        <Route path="/test">
          <TestGamePage {...this_props} key="path-test" />
        </Route>
        <Route path="/demo">
          <DemoGamePage {...this_props} key="path-demo" />
        </Route>
        <Route exact path="/">
          <HomePage {...this_props} key="home" />
        </Route>
        <Route>
          <NotFoundPage {...this_props} key="not-found" />
        </Route>
      </Switch>
    );
  }
}

export { Page, Footer };
