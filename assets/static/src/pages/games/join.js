// Library imports
import React from 'react';

import {
  Link,
} from "react-router-dom";

import { Button } from '@rmwc/button';
import '@rmwc/button/styles';
import * as c from '@rmwc/card';
import '@rmwc/card/styles';
import * as d from '@rmwc/dialog';
import '@rmwc/dialog/styles';
import * as g from '@rmwc/grid';
import '@rmwc/grid/styles';
import * as l from '@rmwc/list';
import '@rmwc/list/styles';
import { Typography } from '@rmwc/typography';
import '@rmwc/typography/styles';
import { TextField } from '@rmwc/textfield';
import '@rmwc/textfield/styles';

// Application imports
import '../../App.css';
import { UserModel, RoomModel, GameModel, normalizeCode } from '../../models.js';
import { LoginForm } from '../login.js';

class JoinGamePage extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      error: null,
      code: normalizeCode(undefined, true) || "",
    }

    this.guest = React.createRef();
  }

  async handleSubmit(event) {
    event.preventDefault();

    if (this.props.user === null || !this.props.user.authed) {
      this.setError("Need to have a user account before doing this action! Perhaps you'd like to play as a guest?");
      return;
    }

    if (this.state.code.length === 6) {
      this.state.code = "rt-" + this.state.code;
    }

    var try_game = this.state.code[0] === "g" && (this.state.code[1] === "c" || this.state.code[1] === "p") && (this.state.code[2] === '-' || this.state.code[2] === ' ');
    var try_room = this.state.code[0] === "r" && (this.state.code[1] === "c" || this.state.code[1] === "p" || this.state.code[1] === "t") && (this.state.code[2] === '-' || this.state.code[2] === ' ');

    if (!try_game && !try_room) {
      try_game = true;
      try_room = true;
    }

    if (try_game) {
      var game = await GameModel.FromCode(this.props.user, this.state.code);
      if (game.error === undefined || game.error === null) {
        this.props.setPage('/game', '?code=' + game.code);
        this.props.setGame(game);
        return;
      }

      if (game.error !== null && !try_room) {
        console.error(game.error);
        this.setError(game.error.message);
        return;
      }
    }

    if (try_room) {
      // Try loading it as a room instead, before displaying the game error page.
      var room = await RoomModel.FromCode(this.props.user, this.state.code);
      if (room.error === undefined || room.error === null) {
        let page = '/room/games';
        if (!room.admitted) {
          page = '/room/members';
        }
        this.props.setRoom(room);
        this.props.setPage(page, '?code=' + room.code);
        return;
      }

      if (room.error !== null) {
        console.error(room.error);
        this.setError(room.error.message);
      }
    }
  }

  async handleGuestSubmit(event) {
    event.preventDefault();

    var user = new UserModel()
    user.display = this.guest.current.value;

    if (!user.display) {
      this.setError("Please specify a name for the guest account");
    }

    await user.createGuest();

    if (user.error !== null) {
      console.error(user.error);
      this.setError(user.error.message);
    } else {
      this.props.setUser(user);
    }
  }

  newState(fn, cb) {
    return this.setState(state => Object.assign({}, state, fn(state)));
  }

  inputHandler(name, checky) {
    return (e) => {
      var v = checky ? e.target.checked : e.target.value;
      return this.newState(() => ({ [name]: v }));
    };
  }

  toggle(name) {
    this.newState(state => ({ [name]: !state[name] }));
  }

  setError(message) {
    this.setState(state => Object.assign({}, state, { error: message }));
  }

  render() {
    let right_column = null;

    if (!this.props.user || !this.props.user.authed) {
      right_column = <>
        <LoginForm {...this.props} />
      </>
  } else if (!this.props.user.guest) {
      right_column = [];
      if (this.props.user.can_create_room) {
        right_column.push(
          <div key="host-room" style={{ padding: '1rem 0px 1rem 0px' }}>
            <c.Card>
              <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
                <div>
                  <Typography use="headline3">Host a Room</Typography>
                  <p>
                    <Link to="/create/room">Looking to make a new room? Create one here!</Link><br /><br />
                    A room lets you play multiple games without having to share a new link every time!
                  </p>
                  <Button raised label="Host a Room" onClick={ () => this.props.setPage('/create/room', false) } />
                </div>
              </div>
            </c.Card>
          </div>
        );
      }

      if (this.props.user.can_create_game) {
        right_column.push(
          <div key="host-game" style={{ padding: '1rem 0px 1rem 0px' }}>
            <c.Card>
              <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
                <div>
                  <Typography use="headline3">Host a Single Game</Typography>
                  <p>
                    <Link to="/create/game">Looking to play a single game with some friends? Make one here!</Link>
                  </p>
                  <Button raised label="Host a Game" onClick={ () => this.props.setPage('/create/game', false) } />
                </div>
              </div>
            </c.Card>
          </div>
        );
      }

      if (!this.props.user.can_create_room && !this.props.user.can_create_game) {
        right_column = <div style={{ padding: '1rem 0px 1rem 0px' }}>
          <c.Card>
            <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
              <div>
                <Typography use="headline3">Trying to create a room or a game?</Typography>
                <p>
                  In order to create rooms and games, <Link to="/pricing">purchase
                  a plan</Link> first.
                </p>
              </div>
            </div>
          </c.Card>
        </div>
      }
    } else {
      right_column = <div style={{ padding: '1rem 0px 1rem 0px' }}>
        <c.Card>
          <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
            <div>
              <Typography use="headline3">Upgrade Your Account</Typography>
              <p>
                You are currently playing as a guest. In order to create your
                own games, <Link to="/profile">upgrade your account</Link> to a
                full account.
              </p>
            </div>
          </div>
        </c.Card>
      </div>;
    }

    let inner = <g.GridRow>
      <g.GridCell align="left" span={6} tablet={8}>
        <c.Card>
          <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
            <div>
              <Typography use="headline3">Join an Existing Room or Game</Typography>
              <p>
                Good luck, and may the odds be ever in your favor!<br /><br />
              Need a refresher on <Link to="/rules/rush">the rules</Link> or want
                to check out <Link to="/docs">the documentation</Link>?
              </p>
            </div>

            <form onSubmit={ this.handleSubmit.bind(this) }>
              <l.List twoLine>
                <l.ListGroup>
                  <l.ListGroupSubheader>Join game</l.ListGroupSubheader>
                  <l.ListItem disabled><TextField fullwidth placeholder="Secret Passcode" name="code" value={ this.state.code } onChange={ this.inputHandler("code") } /></l.ListItem>
                </l.ListGroup>
              </l.List>

              <Button label="Join" raised />
            </form>
            <d.Dialog open={ this.state.error !== null } onClosed={() => this.setError(null) }>
              <d.DialogTitle>Error!</d.DialogTitle>
              <d.DialogContent>{ this.state.error?.message || this.state.error }</d.DialogContent>
              <d.DialogActions>
                <d.DialogButton action="close" theme="secondary">OK</d.DialogButton>
              </d.DialogActions>
            </d.Dialog>
          </div>
        </c.Card>
      </g.GridCell>
      <g.GridCell align="right" span={6} tablet={8}>
        { right_column }
      </g.GridCell>
    </g.GridRow>;

    return (
      <div className="App-page">
        <div>
          <Typography use="headline2">Play a Game</Typography>
          <p>
            Whether or not you're looking to start a new game or join an
            existing one, you've found the right place.
          </p>
        </div>
        {
          !this.props.user ? <g.Grid fixedColumnWidth={ true }><g.GridRow>
            <g.GridCell align="left" span={3} tablet={8} />
            <g.GridCell align="middle" span={6} tablet={8}>
              <c.Card>
                <div style={{ padding: '1rem 1rem 1rem 1rem' }} >
                  <Typography use="headline3">Join as Guest</Typography>
                  <p>
                    Since you're not <Link to="/login">logged in</Link>, how about
                    playing as a guest for now? You can always upgrade your
                    account later. Note that you'll need to create a full
                    account to host your own games.
                  </p>
                  <form onSubmit={ this.handleGuestSubmit.bind(this) }>
                    <TextField fullwidth placeholder="name" name="guest" inputRef={ this.guest } required /><br />
                    <Button label="Play as Guest" raised />
                  </form>
                </div>
              </c.Card>
            </g.GridCell>
          </g.GridRow>
          <br /><br />{ inner }</g.Grid> : <g.Grid fixedColumnWidth={ true }>{ inner }</g.Grid>
        }
      </div>
    );
  }
}

export { JoinGamePage };
