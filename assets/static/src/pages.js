import React from 'react';

import './App.css';

import {
  Route,
  Switch,
} from "react-router-dom";

import { Helmet } from "react-helmet";

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
  shouldComponentUpdate(nextProps) {
    return nextProps.room !== this.props.room || nextProps.game !== this.props.game || nextProps.user !== this.props.user || nextProps.location !== this.props.location;
  }

  render() {
    var this_props = Object.assign({}, this.props, { location: undefined });

    return (
      <Switch>
        <Route exact path="/about">
          <>
            <Helmet>
              <title>About</title>
            </Helmet>
            <AboutPage {...this_props} key="path-about" />
          </>
        </Route>
        <RouteWithGame path="/afterparty" game={ this.props.game }>
          <>
            <Helmet>
              <title>{ "After Pary - Game #" + this.props.game?.id }</title>
            </Helmet>
            <AfterPartyPage {...this_props} key="path-afterparty" />
          </>
          <>
            <Helmet>
              <title>Join Game</title>
            </Helmet>
            <JoinGamePage {...this_props} key="path-afterparty-missing" />
          </>
        </RouteWithGame>
        <RouteWithAuth path="/create/game" user={ this.props.user }>
          <>
            <Helmet>
              <title>Create Game</title>
            </Helmet>
            <CreateGamePage {...this_props} key="path-create-game" />
          </>
          <>
            <Helmet>
              <title>Login</title>
            </Helmet>
            <LoginPage {...this_props} key="path-create-game-unauthed" />
          </>
        </RouteWithAuth>
        <RouteWithAuth path="/create/room" user={ this.props.user }>
          <>
            <Helmet>
              <title>Create a Room</title>
            </Helmet>
            <CreateRoomPage {...this_props} key="path-create-room" />
          </>
          <>
            <Helmet>
              <title>Login</title>
            </Helmet>
            <LoginPage {...this_props} key="path-create-room-unauthed" />
          </>
        </RouteWithAuth>
        <Route path="/docs">
          <>
            <Helmet>
              <title>Documentation</title>
            </Helmet>
            <DocsPage {...this_props} key="path-docs" />
          </>
        </Route>
        <Route path="/join">
          <>
            <Helmet>
              <title>Join Game</title>
            </Helmet>
            <JoinGamePage {...this_props} key="path-join" />
          </>
        </Route>
        <Route path="/login">
          <>
            <Helmet>
              <title>Login</title>
            </Helmet>
            <LoginPage {...this_props} key="path-login" />
          </>
        </Route>
        <RouteWithGame path="/play" game={ this.props.game }>
          <>
            <Helmet>
              <title>{ "Pre-Game - Game #" + this.props.game?.id }</title>
            </Helmet>
            <PreGamePage {...this_props} key="path-play" />
          </>
          <>
            <Helmet>
              <title>Join Game</title>
            </Helmet>
            <JoinGamePage {...this_props} key="path-play-missing" />
          </>
        </RouteWithGame>
        <RouteWithGame path="/playing" game={ this.props.game }>
          <>
            <Helmet>
              <title>{ "Playing - Game #" + this.props.game?.id }</title>
            </Helmet>
            <GamePage {...this_props} key="path-playing" />
          </>
          <>
            <Helmet>
              <title>Join Game</title>
            </Helmet>
            <JoinGamePage {...this_props} key="path-playing-missing" />
          </>
        </RouteWithGame>
        <Route path="/pricing">
          <>
            <Helmet>
              <title>Pricing</title>
            </Helmet>
            <PricingPage {...this_props} key="path-pricing" />
          </>
        </Route>
        <Route path="/privacy">
          <>
            <Helmet>
              <title>Privacy Policy</title>
            </Helmet>
            <PrivacyPage {...this_props} key="path-privacy" />
          </>
        </Route>
        <RouteWithAuth path="/profile" user={ this.props.user }>
          <>
            <Helmet
              titleTemplate="%s - Account Preferences | Willow Patch Games"
              defaultTitle="Account Preferences | Welcome to Willow Patch Games"
            >
              <title>Account Preferences</title>
            </Helmet>
            <ProfilePage {...this_props} key="path-profile" />
          </>
          <>
            <Helmet>
              <title>Login</title>
            </Helmet>
            <LoginPage {...this_props} key="path-profile-unauthed" />
          </>
        </RouteWithAuth>
        <RouteWithRoom path="/room" room={ this.props.room }>
          <>
            <Helmet
              titleTemplate={ "%s - Room #" + this.props.room?.id + " | Willow Patch Games" }
              defaultTitle={ "Room #" + this.props.room?.id + " | Willow Patch Games" }
            />
            <RoomPage {...this_props} key="path-room" />
          </>
          <>
            <Helmet>
              <title>Join Game</title>
            </Helmet>
            <JoinGamePage {...this_props} key="path-room-missing" />
          </>
        </RouteWithRoom>
        <Route path="/rules/rush">
          <>
            <Helmet>
              <title>Rush - Rules</title>
            </Helmet>
            <RushRulesPage {...this_props} key="path-rules-rush" />
          </>
        </Route>
        <Route path="/signup">
          <>
            <Helmet>
              <title>Sign Up</title>
            </Helmet>
            <SignupPage {...this_props} key="path-signup" />
          </>
        </Route>
        <Route path="/home">
          <HomePage {...this_props} key="path-home" />
        </Route>
        <Route path="/demo">
          <DemoGamePage {...this_props} key="path-demo" />
        </Route>
        <Route exact path="/">
          <HomePage {...this_props} key="home" />
        </Route>
        <Route>
          <>
            <Helmet>
              <title>404 Error - Not Found</title>
            </Helmet>
            <NotFoundPage {...this_props} key="not-found" />
          </>
        </Route>
      </Switch>
    );
  }
}

export { Page, Footer };
