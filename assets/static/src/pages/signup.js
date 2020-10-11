import React from 'react';

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

class SignupPage extends React.Component {
  constructor(props) {
    super(props);

    this.username = React.createRef();
    this.email = React.createRef();
    this.display = React.createRef();
    this.password = React.createRef();

    this.state = {
      error: null
    }
  }

  async handleSubmit(event) {
    event.preventDefault();

    var user = new UserModel();
    user.username = this.username.current.value;
    user.email = this.email.current.value;
    user.display = this.display.current.value;

    await user.create(this.password.current.value);

    if (user.authed) {
      this.props.setUser(user);
      this.props.setPage('home');
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
          <Typography use="headline2">Sign up!</Typography>
          <p>
            We&apos;re happy you&apos;re joining Willow Patch Games!<br /><br />
            We only need a username or an email (or both, if you&apos;d like account recovery or notifications) and a password.<br /><br />
            If you&apos;re not happy with your display name being your username (or your desired username is taken), feel free to set a different one. This need not be unique.
          </p>
        </div>
        <g.Grid fixedColumnWidth={ true }>
          <g.GridCell align="left" span={3} />
          <g.GridCell align="middle" span={6}>
            <c.Card>
              <div style={{ padding: '1rem 1rem 1rem 1rem' }} >

                <form onSubmit={ this.handleSubmit.bind(this) }>
                  <TextField fullwidth placeholder="username" name="username" inputRef={ this.username } /><br />
                  <TextField fullwidth placeholder="email" name="email" type="email" inputRef={ this.email } /><br />
                  <TextField fullwidth placeholder="display" name="display" inputRef={ this.display } /><br />
                  <TextField fullwidth placeholder="password" name="password" type="password" inputRef={ this.password } /><br />
                  <Button label="Sign up" raised />
                </form>
                <d.Dialog open={ this.state.error !== null } onClosed={() => this.setError(null) }>
                  <d.DialogTitle>Error!</d.DialogTitle>
                  <d.DialogContent>{ this.state.error }</d.DialogContent>
                  <d.DialogActions>
                    <d.DialogButton action="close" theme="secondary">OK</d.DialogButton>
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

export { SignupPage };
