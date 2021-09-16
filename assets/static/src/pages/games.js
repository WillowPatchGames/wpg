// Library imports
import React from 'react';

import * as g from '@rmwc/grid';
import '@rmwc/grid/styles';
import { Typography } from '@rmwc/typography';
import '@rmwc/typography/styles';

// Application imports
import '../App.css';
import '../main.scss';
import { GameModel } from '../models.js';
import { loadGame, addEv, notify, killable } from './games/common.js';
import { EightJacksGamePage } from './games/eightjacks/page.js'
import { GinGamePage } from './games/gin/page.js'
import { HeartsGamePage } from './games/hearts/page.js'
import { RushGamePage } from './games/rush/page.js'
import { SpadesGamePage } from './games/spades/page.js'
import { ThreeThirteenGamePage } from './games/threethirteen/page.js'
import { CreateGameForm } from './games/config.js';
import { PreGameAdminPage } from './games/pregame/admin.js';
import { PreGameUserPage } from './games/pregame/user.js';
import { JoinGamePage } from './games/join.js';

class GamePage extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      counter: 1,
    };
  }

  async componentDidMount() {
    var game = this.props.game;
    if (this.props.room && !this.props.game) {
      var id = parseInt(this.props.history.location.pathname.substr("/room/game/".length));
      game = await GameModel.FromId(this.props.user, id);
    }

    if (!game) {
      console.log("No game yet...", this.props.room, this.props.game);
      return;
    }

    await game.update();
    if (this.props.room && game.lifecycle === "pending") {
      this.props.setPage("/room/games", true);
      return;
    }

    game = loadGame(game);
    this.props.setGame(game);
    this.unmount = addEv(game, {
      "admitted": async (data) => {
        if (data.admitted) {
          this.setState(state => Object.assign({}, this.state, { status: "waiting" }));
        } else {
          this.setState(state => Object.assign({}, this.state, { status: "pending", players: null }));
        }
      },
      "started": data => {
        this.props.game.lifecycle = "playing";
        this.props.game.spectating = !data.playing;
        let page = this.props.room ? "/room/game/" + this.props.game.id : "/game";
        this.props.setPage(page, true);
        this.setState(state => state);
      },
      "finished": async (data) => {
        this.props.game.lifecycle = "finished";
        let page = this.props.room ? "/room/game/" + this.props.game.id : "/game";
        this.props.setPage(page, true);
        this.setState(state => state);
      },
    });
  }

  async componentWillUnmount() {
    this.props.setGame(null);
    if (this.unmount) this.unmount();
    this.props.setNotification(null, "Your Turn!");
    this.props.setNotification(null, "Starting!");
    if (this.props.game?.interface) {
      this.props.game.interface.close();
    }
    this.props.setGame(null);
  }

  componentDidCatch(error, info) {
    console.log("Got an exception that we're ignoring:", error, info);
  }

  render() {
    if (!this.props.game) {
      return "Please wait for the game to load...";
    }

    var mode = this.props.game.mode || this.props.game.style;
    let pending = !this.props.game.admitted || this.props.game.lifecycle === 'pending' || !this.props.game.interface;
    let playing = !this.props.game.spectating && this.props.game.lifecycle === 'playing';

    if (pending) {
      return <PreGamePage {...this.props} />;
    } else if (playing) {
      if (mode === 'rush') {
        return <RushGamePage {...this.props} />
      } else if (mode === 'spades') {
        return <SpadesGamePage {...this.props} />
      } else if (mode === 'three thirteen') {
        return <ThreeThirteenGamePage {...this.props} />
      } else if (mode === 'hearts') {
        return <HeartsGamePage {...this.props} />
      } else if (mode === 'eight jacks') {
        return <EightJacksGamePage {...this.props} />
      } else if (mode === 'gin') {
        return <GinGamePage {...this.props} />
      } else {
        return "Unrecognized game mode: " + mode;
      }
    } else {
      return <AfterPartyPage {...this.props} />;
    }
  }
}

class PreGamePage extends React.Component {
  constructor(props) {
    super(props);
    this.state = null;
    this.admin = this.props.user && (this.props.user?.id === this.props.game?.owner);
    this.game = loadGame(this.props.game);
    this.props.setGame(this.game);
  }
  async componentDidMount() {
    await this.props.game.update();

    this.game = loadGame(this.props.game);
    this.props.setGame(this.game);
  }
  render() {
    return this.admin ? <PreGameAdminPage {...this.props} /> : <PreGameUserPage {...this.props} />
  }
}

class AfterPartyPage extends React.Component {
  constructor(props) {
    super(props);
    this.game = loadGame(this.props.game);
    this.props.setGame(this.game);
  }
  render() {
    var mode = this.props.game.mode || this.props.game.style;
    if (mode === 'rush') {
      return <RushGamePage {...this.props}/>
    } else if (mode === 'spades') {
      return <SpadesGamePage {...this.props}/>
    } else if (mode === 'three thirteen') {
      return <ThreeThirteenGamePage {...this.props}/>
    } else if (mode === 'hearts') {
      return <HeartsGamePage {...this.props}/>
    } else if (mode === 'eight jacks') {
      return <EightJacksGamePage {...this.props}/>
    } else if (mode === 'gin') {
      return <GinGamePage {...this.props}/>
    } else {
      return "Unrecognized game mode: " + mode;
    }
  }
}

class CreateGamePage extends React.Component {
  render() {
    return (
      <div className="App-page">
        <div>
          <Typography use="headline2">Create a Game</Typography>
          <p>
            Invite your friends to play online with you!<br />
          </p>
        </div>
        <g.Grid fixedColumnWidth={ true }>
          <g.GridCell align="left" span={3} tablet={8} />
          <g.GridCell align="middle" span={6} tablet={8}>
            <CreateGameForm {...this.props} />
          </g.GridCell>
        </g.Grid>
      </div>
    );
  }
}

export {
  loadGame,
  addEv,
  notify,
  killable,
  AfterPartyPage,
  CreateGamePage,
  CreateGameForm,
  JoinGamePage,
  PreGamePage,
  RushGamePage,
  GamePage,
};
