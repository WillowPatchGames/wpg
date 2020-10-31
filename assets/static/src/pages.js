import React from 'react';

import './App.css';
import '@rmwc/icon/styles';

import {
  Route,
  Switch,
} from "react-router-dom";

import { AboutPage } from './pages/about.js';
import { DocsPage } from './pages/docs.js';
import { Footer } from './pages/footer.js';
import { AfterPartyPage, CreateGamePage, CreateRoomPage, JoinGamePage, PreGamePage, RushGamePage } from './pages/games.js';
import { HomePage } from './pages/home.js';
import { LoginPage } from './pages/login.js';
import { ProfilePage } from './pages/profile.js';
import { RoomPage } from './pages/room.js';
import { RushRulesPage } from './pages/rules.js';
import { SignupPage } from './pages/signup.js';
import { PricingPage } from './pages/pricing.js';
import { PrivacyPage } from './pages/privacy.js';

class RouteWithAuth extends React.Component {
  render() {
    return (
      <Route path={ this.props.path } render={
        () =>
          this.props.user && this.props.user.authed
          ? this.props.children[0]
          : this.props.children[1]
      } />
    )
  }
}

class RouteWithGame extends React.Component {
  render() {
    return (
      <Route path={ this.props.path } render={
        () =>
          this.props.game
          ? this.props.children[0]
          : this.props.children[1]
      } />
    )
  }
}

class RouteWithRoom extends React.Component {
  render() {
    return (
      <Route path={ this.props.path } render={
        () =>
          this.props.room
          ? this.props.children[0]
          : this.props.children[1]
      } />
    )
  }
}

class Page extends React.Component {
  render() {
    var this_props = Object.assign({}, this.props, { location: undefined });

    return (
      <Switch>
        <Route exact path="/about">
          <AboutPage {...this_props} />
        </Route>
        <RouteWithGame path="/afterparty" game={ this.props.game }>
          <AfterPartyPage {...this_props} />
          <JoinGamePage {...this_props} />
        </RouteWithGame>
        <RouteWithAuth path="/create/game" user={ this.props.user }>
          <CreateGamePage {...this_props} />
          <LoginPage {...this_props} />
        </RouteWithAuth>
        <RouteWithAuth path="/create/room" user={ this.props.user }>
          <CreateRoomPage {...this_props} />
          <LoginPage {...this_props} />
        </RouteWithAuth>
        <Route path="/docs">
          <DocsPage {...this_props} />
        </Route>
        <Route path="/join">
          <JoinGamePage {...this_props} />
        </Route>
        <Route path="/login">
          <LoginPage {...this_props} />
        </Route>
        <RouteWithGame path="/play" game={ this.props.game }>
          <PreGamePage {...this_props} />
          <JoinGamePage {...this_props} />
        </RouteWithGame>
        <RouteWithGame path="/playing" game={ this.props.game }>
          <RushGamePage {...this_props} />
          <JoinGamePage {...this_props} />
        </RouteWithGame>
        <Route path="/pricing">
          <PricingPage {...this_props} />
        </Route>
        <Route path="/privacy">
          <PrivacyPage {...this_props} />
        </Route>
        <Route path="/profile">
          <ProfilePage {...this_props} />
        </Route>
        <RouteWithRoom path="/room" room={ this.props.room }>
          <RoomPage {...this_props} />
          <JoinGamePage {...this_props} />
        </RouteWithRoom>
        <Route path="/rules/rush">
          <RushRulesPage {...this_props} />
        </Route>
        <Route path="/signup">
          <SignupPage {...this_props} />
        </Route>
        <Route path="/home">
          <HomePage {...this_props} />
        </Route>
        <Route exact path="/">
          <HomePage {...this_props} />
        </Route>
      </Switch>
    );
  }
}

export { Page, Footer };
