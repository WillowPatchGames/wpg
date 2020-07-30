import React from 'react';

import './App.css';
import '@rmwc/top-app-bar/styles';
import 'rmwc/dist/styles';
import '@rmwc/icon/styles';
import '@rmwc/button/styles';
import '@rmwc/card/styles';
import '@rmwc/grid/styles';
import '@rmwc/typography/styles';
import '@rmwc/textfield/styles';
import '@rmwc/theme/styles';

import { Button } from '@rmwc/button';
import * as c from '@rmwc/card';
import * as g from '@rmwc/grid';
import { Typography } from '@rmwc/typography';
import { TextField } from '@rmwc/textfield';
import * as bar from '@rmwc/top-app-bar';
import { Theme, ThemeProvider } from '@rmwc/theme';

class AuthedNavComponent extends React.Component {
   render() {
    if (this.props.authed) {
      return (
        <div>
          <Button label="Profile" icon="person" unelevated />
          <Button label="Logout" icon="logout" unelevated onClick={() => this.props.setAuth(!this.props.authed) } />
          <Button label="About" icon="notes" unelevated />
        </div>
      );
    }

    return (
      <div>
        <Button label="Login" icon="login" unelevated onClick={() => this.props.setAuth(!this.props.authed) } />
        <Button label="Join" icon="person_add" unelevated />
        <Button label="About" icon="notes" unelevated />
      </div>
    );
  }
}

class Navigation extends React.Component {
  render() {
    return (
      <header>
        <bar.TopAppBar fixed>
          <bar.TopAppBarRow>
            <bar.TopAppBarSection alignStart>
              <bar.TopAppBarNavigationIcon icon="home" onClick={() => this.props.setPage('home') } />
              <bar.TopAppBarTitle>WordCorp</bar.TopAppBarTitle>
            </bar.TopAppBarSection>
            <bar.TopAppBarSection alignEnd>
              <AuthedNavComponent authed={ this.props.authed } setAuth={ this.props.setAuth } />
            </bar.TopAppBarSection>
          </bar.TopAppBarRow>
        </bar.TopAppBar>
        <bar.TopAppBarFixedAdjust />
        <nav>
        </nav>
      </header>
    );
  }
}

class LoginPage extends React.Component {
  handleSubmit(event) {
    event.preventDefault();
  }

  render() {
    return (
      <div>
        <ThemeProvider
          options={{
            primary: 'white',
            surface: '#1397BD',
            background: 'white',
          }}
        >
          <g.Grid fixedColumnWidth={ true }>
            <g.GridCell align="left" span={3} />
            <g.GridCell align="middle" span={6}>
              <c.Card>
                <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
                  <form onSubmit={ this.handleSubmit }>
                    <TextField fullwidth placeholder="username" name="username" /><br />
                    <TextField fullwidth placeholder="password" name="password" /><br />
                    <Button label="Login" raised />
                  </form>
                </div>
              </c.Card>
            </g.GridCell>
          </g.Grid>
        </ThemeProvider>
      </div>
    );
  }
}

class HomePage extends React.Component {
  render() {
    return (
        <div className="App-hero">
          <Theme use={ 'onPrimary' } >
            <div className="styles.intro">
              <div>
                <Typography use="headline1">
                  Welcome to WordCorp!
                </Typography>
              </div>
              <div>
                <Typography use="headline2">
                  Home of wonderful word games
                </Typography>
              </div>
              <g.Grid fixedColumnWidth={ true }>
                <g.GridCell align="left" span={2} />
                <g.GridCell align="middle" span={8}>
                  <c.Card>
                    <c.CardPrimaryAction>
                      <p>
                        Hi! I&apos;m Alex and he&apos;s Nick and we&apos;ve created a fun website to play games on.
                        <br /><br />
                        At least, we think it is fun.
                      </p>
                    </c.CardPrimaryAction>
                  </c.Card>
                </g.GridCell>
              </g.Grid>
            </div>
          </Theme>
        </div>
    );
  }
}

class Page extends React.Component {
  render() {
    return (
      <div>
      { this.props.page === 'home' && <HomePage /> }
      { this.props.page === 'login' && <LoginPage /> }
      </div>
    );
  }
}

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      authed: false,
      page: 'home'
    };
  }

  setAuth(authed) {
    if (authed && !this.state.authed) {
      this.setState(state => Object.assign({}, state, { page: 'login'}));
      return
    }

    this.setState(state => Object.assign({}, state, { authed }));
  }

  setPage(page) {
    this.setState(state => Object.assign({}, state, { page }));
  }

  render() {
    return (
      <div className="App">
        <ThemeProvider
          options={{
            primary: '#1397BD',
            onPrimary: 'white',
            primaryBg: '#000',
            surface: '#19718A',
          }}
        >

        <Navigation authed={ this.state.authed } setAuth={ this.setAuth.bind(this) } setPage={ this.setPage.bind(this) } />
        <Page page={ this.state.page } />
      </ThemeProvider>

      </div>
    );
  }
}

export default App;
