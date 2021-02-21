import React from 'react';

import { Button } from '@rmwc/button';
import '@rmwc/button/styles';
import { IconButton } from '@rmwc/icon-button';
import '@rmwc/icon-button/styles';
import * as d from '@rmwc/drawer';
import '@rmwc/drawer/styles';
import * as l from '@rmwc/list';
import '@rmwc/list/styles';
import * as bar from '@rmwc/top-app-bar';
import '@rmwc/top-app-bar/styles';

import './App.css';

class AuthedHeaderComponent extends React.Component {
  render() {
    if (this.props.user !== null && this.props.user.authed) {
      return (
        <div>
          <Button label={ this.props.user.display } icon="person" unelevated onClick={ () => this.props.setPage('profile') } />
          <Button label="Logout" icon="logout" unelevated onClick={() => this.props.setUser(null) } />
          <Button label="Play" icon="games" unelevated onClick={() => this.props.setPage(this.props.game ? '/game' : '/join', true)} />
          { this.props.immersive ? <></> :
            <bar.TopAppBarActionItem icon="games" onClick={() => this.props.setPage(this.props.game ? '/game' : '/join', true) } />
          }
        </div>
      );
    }

    return (
      <div>
        <Button label="Login" icon="login" unelevated onClick={() => this.props.setPage('login') } />
        <Button label="Sign up" icon="person_add" unelevated onClick={() => this.props.setPage('signup') } />
        <Button label="About" icon="notes" unelevated onClick={() => this.props.setPage('about') } />
        <Button label="Play" icon="games" unelevated onClick={() => this.props.setPage('/game', true)} />
        { this.props.immersive ? <></> :
          <bar.TopAppBarActionItem icon="games" onClick={() => this.props.setPage('/game', true) } />
        }
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
          <l.ListItem onClick={ () => this.props.setPage('join') }>
            <l.ListItemGraphic icon="games" />
            <l.ListItemText>Play a new game</l.ListItemText>
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
        <l.ListItem onClick={ () => this.props.setPage('signup') }>
          <l.ListItemGraphic icon="person_add" />
          <l.ListItemText>Sign up</l.ListItemText>
        </l.ListItem>
        <l.ListItem onClick={ () => this.props.setPage('join') }>
          <l.ListItemGraphic icon="games" />
          <l.ListItemText>Play a game</l.ListItemText>
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
    return (<>
      <bar.TopAppBar fixed short shortCollapsed={ this.props.immersive } style={{ marginTop: '0px', 'borderTop': '0', 'paddingTop': '0px' }}>
        <bar.TopAppBarRow style={{ marginTop: '0px', 'borderTop': '0', 'paddingTop': '0px' }}>
          <bar.TopAppBarSection style={{ marginTop: '0px', 'borderTop': '0', 'paddingTop': '0px' }}>
            <IconButton icon="menu" onClick={() => this.setOpen(!this.state.navVisible) } />
            <Button className="App-Title" onClick={() => this.props.setPage('') } style={{ color: 'black' }}>Willow Patch Games</Button>
          </bar.TopAppBarSection>
          <bar.TopAppBarSection alignEnd className="App-AuthedHeaderComponent">
            <AuthedHeaderComponent user={ this.props.user } immersive={ this.props.immersive } setPage={ this.props.setPage } setUser={ this.props.setUser } />
          </bar.TopAppBarSection>
        </bar.TopAppBarRow>
      </bar.TopAppBar>
      <bar.TopAppBarFixedAdjust />
      <nav>
        <d.Drawer modal open={ this.state.navVisible } onClose={ () => this.setOpen(false) } >
          <d.DrawerContent>
            <l.List onClick={ () => this.setOpen(false) }>
              <l.ListItem onClick={ () => this.props.setPage('') }>
                <l.ListItemGraphic icon="home" />
                <l.ListItemText>Home</l.ListItemText>
              </l.ListItem>
              <AuthedNavComponent user={ this.props.user } setPage={ this.props.setPage } setUser={ this.props.setUser } />
              <l.ListItem onClick={ () => this.props.setPage('about') }>
                <l.ListItemGraphic icon="notes" />
                <l.ListItemText>About</l.ListItemText>
              </l.ListItem>
              {
                // eslint-disable-next-line
                <a href="https://blog.willowpatchgames.com" target="_blank">
                  <l.ListItem>
                    <l.ListItemGraphic icon="book" />
                    <l.ListItemText>Blog</l.ListItemText>
                  </l.ListItem>
                </a>
              }
              <l.ListItem onClick={ () => this.props.setPage('rules/rush') }>
                <l.ListItemGraphic icon="notes" />
                <l.ListItemText>Rules - Rush!</l.ListItemText>
              </l.ListItem>
              <l.ListItem onClick={ () => this.props.setPage('docs') }>
                <l.ListItemGraphic icon="notes" />
                <l.ListItemText>Documentation</l.ListItemText>
              </l.ListItem>
              <l.ListItem onClick={ () => this.props.setPage('pricing') }>
                <l.ListItemGraphic icon="notes" />
                <l.ListItemText>Pricing</l.ListItemText>
              </l.ListItem>
            </l.List>
          </d.DrawerContent>
        </d.Drawer>
      </nav>
    </>);
  }
}

export {
  Navigation
};
