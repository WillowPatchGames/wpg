import React from 'react';

import '../App.css';
import '@rmwc/button/styles';
import '@rmwc/card/styles';
import '@rmwc/dialog/styles';
import '@rmwc/grid/styles';
import '@rmwc/textfield/styles';
import '@rmwc/typography/styles';

import { Button } from '@rmwc/button';
import * as c from '@rmwc/card';
import * as d from '@rmwc/dialog';
import * as g from '@rmwc/grid';
import { TextField } from '@rmwc/textfield';
import { Typography } from '@rmwc/typography';

import { UserModel } from '../models.js';

class LoginPage extends React.Component {
  constructor(props) {
    super(props);

    this.identifier = React.createRef();
    this.password = React.createRef();

    this.state = {
      error: null
    }
  }

  async handleSubmit(event) {
    event.preventDefault();

    var user = new UserModel();
    var identifier = this.identifier.current.value;
    if (identifier.includes("@")) {
      user.email = identifier;
    } else {
      user.username = identifier;
    }

    await user.login(this.password.current.value);

    if (!user.error) {
      this.props.setUser(user);
      if (!this.props.page || this.props.page === 'login') {
        this.props.setPage('join');
      }
    } else {
      this.setError(user.error.message);
    }
  }

  setError(message) {
    this.setState(state => Object.assign({}, state, { error: message }));
  }

  render() {

    return (
      <div className="App-page">
        <div>
          <Typography use="headline2">Login</Typography>
          <p>
            Enter your username or email and password to log into WordCorp.<br/><br/>
            <a href="#signup">New user? Sign up instead!</a>
          </p>
        </div>
        <g.Grid fixedColumnWidth={ true }>
          <g.GridCell align="left" span={3} />
          <g.GridCell align="middle" span={6}>
            <c.Card>
              <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
                <form onSubmit={ this.handleSubmit.bind(this) }>
                  <TextField fullwidth placeholder="identifier" name="identifier" inputRef={ this.identifier } /><br />
                  <TextField fullwidth placeholder="password" name="password" type="password" inputRef={ this.password } /><br />
                  <Button label="Login" raised />
                </form>
                <d.Dialog open={ this.state.error !== null } onClosed={() => this.setError(null) }>
                  <d.DialogTitle>Error!</d.DialogTitle>
                  <d.DialogContent>{ this.state.error }</d.DialogContent>
                  <d.DialogActions>
                    <d.DialogButton action="close">OK</d.DialogButton>
                  </d.DialogActions>
                </d.Dialog>
              </div>
            </c.Card>
          </g.GridCell>
        </g.Grid>
      </div>
    );
  }
}

export { LoginPage };
