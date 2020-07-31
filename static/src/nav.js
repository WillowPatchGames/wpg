import React from 'react';

import './App.css';
import '@rmwc/top-app-bar/styles';
import 'rmwc/dist/styles';
import '@rmwc/icon/styles';
import '@rmwc/icon-button/styles';
import '@rmwc/button/styles';
import '@rmwc/card/styles';
import '@rmwc/dialog/styles';
import '@rmwc/drawer/styles';
import '@rmwc/grid/styles';
import '@rmwc/list/styles';
import '@rmwc/typography/styles';
import '@rmwc/textfield/styles';
import '@rmwc/theme/styles';

import { Button } from '@rmwc/button';
import { IconButton } from '@rmwc/icon-button';
import * as d from '@rmwc/drawer';
import * as l from '@rmwc/list';
import * as bar from '@rmwc/top-app-bar';

class AuthedHeaderComponent extends React.Component {
  render() {
    if (this.props.user !== null && this.props.user.authed) {
      return (
        <div>
          <Button label={ this.props.user.display } icon="person" unelevated  onClick={ () => this.props.setPage('profile') } />
          <Button label="Logout" icon="logout" unelevated onClick={() => this.props.setUser(null) } />
        </div>
      );
    }

    return (
      <div>
        <Button label="Login" icon="login" unelevated onClick={() => this.props.setPage('login') } />
        <Button label="Join" icon="person_add" unelevated />
        <Button label="About" icon="notes" unelevated />
      </div>
    );
  }
}

class AuthedNavComponent extends React.Component {
  render() {
    if (this.props.user !== null && this.props.user.authed) {
      return (
        <>
          <l.ListItem onClick={ () => this.props.setPage('profile') }>
            <l.ListItemGraphic icon="person" />
            <l.ListItemText>{ this.props.user.display }</l.ListItemText>
          </l.ListItem>
          <l.ListItem onClick={ () => this.props.setPage('play') }>
            <l.ListItemGraphic icon="games" />
            <l.ListItemText>Play</l.ListItemText>
          </l.ListItem>
          <l.ListItem onClick={ () => this.props.setUser(null) }>
            <l.ListItemGraphic icon="logout" />
            <l.ListItemText>Logout</l.ListItemText>
          </l.ListItem>
        </>
      );
    }

    return (
      <>
        <l.ListItem onClick={ () => this.props.setPage('join') }>
          <l.ListItemGraphic icon="person_add" />
          <l.ListItemText>Join</l.ListItemText>
        </l.ListItem>
        <l.ListItem onClick={ () => this.props.setPage('login') }>
          <l.ListItemGraphic icon="login" />
          <l.ListItemText>Login</l.ListItemText>
        </l.ListItem>
      </>
    );
  }
}

class Navigation extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      navVisible: false
    }
  }

  setOpen(navVisible) {
    this.setState(state => Object.assign([], state, { navVisible }));
  }

  render() {
    return (
      <header>
        <bar.TopAppBar fixed>
          <bar.TopAppBarRow>
            <bar.TopAppBarSection>
              <IconButton icon="menu" onClick={() => this.setOpen(!this.state.navVisible) } />
              <bar.TopAppBarTitle>WordCorp</bar.TopAppBarTitle>
            </bar.TopAppBarSection>
            <bar.TopAppBarSection alignEnd className="App-AuthedHeaderComponent">
              <AuthedHeaderComponent user={ this.props.user } setPage={ this.props.setPage } setUser={ this.props.setUser } />
            </bar.TopAppBarSection>
          </bar.TopAppBarRow>
        </bar.TopAppBar>
        <bar.TopAppBarFixedAdjust />
        <nav>
          <d.Drawer modal open={ this.state.navVisible } onClose={ () => this.setOpen(false) } >
            <d.DrawerContent>
              <l.List onClick={ () => this.setOpen(false) }>
                <l.ListItem onClick={ () => this.props.setPage('home') }>
                  <l.ListItemGraphic icon="home" />
                  <l.ListItemText>Home</l.ListItemText>
                </l.ListItem>
                <AuthedNavComponent user={ this.props.user } setPage={ this.props.setPage } setUser={ this.props.setUser } />
                <l.ListItem onClick={ () => this.props.setPage('about') }>
                  <l.ListItemGraphic icon="notes" />
                  <l.ListItemText>About</l.ListItemText>
                </l.ListItem>
              </l.List>
            </d.DrawerContent>
          </d.Drawer>
        </nav>
      </header>
    );
  }
}

export {
  Navigation
};
