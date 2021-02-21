import React from 'react';

import './App.css';

import {
  Redirect,
  Route,
  Switch,
} from "react-router-dom";

import { Helmet } from "react-helmet";

import { AboutPage } from './pages/about.js';
import { NotFoundPage } from './pages/common.js';
import { DocsPage } from './pages/docs.js';
import { Footer } from './pages/footer.js';
import { CreateGamePage, CreateRoomPage, JoinGamePage, GamePage } from './pages/games.js';
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
  render() {
    var this_props = Object.assign({}, this.props, { location: undefined });

    let notified_preferences_title = "%s - Account Preferences | Welcome to Willow Patch Games";
    let notified_preferences_default = "Account Preferences | Welcome to Willow Patch Games";
    let notified_room_title = "%s - Room #" + this.props.room?.id + " | Willow Patch Games";
    let notified_room_default = "Room #" + this.props.room?.id + " | Willow Patch Games";
    if (this.props.notification !== undefined && this.props.notification !== null && this.props.notification !== "") {
      notified_preferences_title = "(" + this.props.notification + ") " + notified_preferences_title;
      notified_preferences_default = "(" + this.props.notification + ") " + notified_preferences_default;
      notified_room_title = "(" + this.props.notification + ") " + notified_room_title;
      notified_room_default = "(" + this.props.notification + ") " + notified_room_default;
    }

    let params = new URLSearchParams(window.location.search);
    let new_path = params.get("path");
    new_path = new_path ? new_path : "/";
    let search = window.location.search;
    if (search && search[0] !== "?") {
      search = "?" + search;
    }

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
        <RouteWithAuth path="/create/game" user={ this.props.user }>
          <>
            <Helmet>
              <title>Create Game</title>
            </Helmet>
            <CreateGamePage {...this_props} key="path-create-game" />
          </>
          <Redirect to="/login?path=/create/game" />
        </RouteWithAuth>
        <RouteWithAuth path="/create/room" user={ this.props.user }>
          <>
            <Helmet>
              <title>Create a Room</title>
            </Helmet>
            <CreateRoomPage {...this_props} key="path-create-room" />
          </>
          <Redirect to="/login?path=/create/room" />
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
        <RouteWithAuth path="/login" user={ this.props.user }>
          <Redirect to={ new_path } />
          <>
            <Helmet>
              <title>Login</title>
            </Helmet>
            <LoginPage {...this_props} key="path-login" />
          </>
        </RouteWithAuth>
        <RouteWithGame path="/game" user={ this.props.user } game={ this.props.game } room={ this.props.room }>
          <>
            <Helmet>
              <title>{ "Game #" + this.props.game?.id }</title>
            </Helmet>
            <GamePage {...this_props} key="path-play" />
          </>
          <>
            <Helmet>
              <title>Join Game</title>
            </Helmet>
            <JoinGamePage {...this_props} key="path-play-missing" />
          </>
        </RouteWithGame>
        <Route path="/play">
          <Redirect to={ "/game" + search } />
        </Route>
        <Route path="/playing">
          <Redirect to={ "/game" + search } />
        </Route>
        <Route path="/afterparty">
          <Redirect to={ "/game" + search } />
        </Route>
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
              titleTemplate={ notified_preferences_title }
              defaultTitle={ notified_preferences_default }
            >
              <title>Account Preferences</title>
            </Helmet>
            <ProfilePage {...this_props} key="path-profile" />
          </>
          <Redirect to="/login?path=/profile" />
        </RouteWithAuth>
        <RouteWithRoom path="/room" user={ this.props.user } room={ this.props.room }>
          <>
            <Helmet
              titleTemplate={ notified_room_title }
              defaultTitle={ notified_room_default }
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
        <RouteWithAuth path="/signup" user={ this.props.user }>
          <Redirect to="profile" />
          <>
            <Helmet>
              <title>Sign Up</title>
            </Helmet>
            <SignupPage {...this_props} key="path-signup" />
          </>
        </RouteWithAuth>
        <Route path="/home">
          <HomePage {...this_props} key="path-home" />
        </Route>
        <Route path="/demo">
          <DemoGamePage {...this_props} key="path-demo" />
        </Route>
        <Route exact path="/">
          <HomePage {...this_props} key="home" />
        </Route>
        <Route path="/react-snap-200">
          null
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
