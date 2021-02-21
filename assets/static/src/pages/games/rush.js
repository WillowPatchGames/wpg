// Library imports
import React from 'react';

import { Avatar, AvatarCount, AvatarGroup } from '@rmwc/avatar';
import '@rmwc/avatar/styles';
import { Button } from '@rmwc/button';
import '@rmwc/button/styles';
import * as c from '@rmwc/card';
import '@rmwc/card/styles';
import * as g from '@rmwc/grid';
import '@rmwc/grid/styles';
import * as l from '@rmwc/list';
import '@rmwc/list/styles';

// Application imports
import { RushGame, RushData } from '../../games/rush.js';
import { RushGameComponent } from './rush-component.js';

import { loadGame, addEv, notify, killable, CreateGameForm } from '../games.js';
import { UserCache, GameCache } from '../../utils/cache.js';
import { gravatarify } from '../../utils/gravatar.js';


class RushGameSynopsis extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      players: null,
      remaining: null,
    }

    this.game = loadGame(this.props.game);
    this.props.setGame(this.game);

    if (this.game) {
      this.state.interface = this.game.interface;
      this.unmount = addEv(this.game, {
        "synopsis": async (data) => {
          if (data && data.players && data.remaining !== undefined) {
            let players = {};
            for (let player of data.players) {
              var id = +player.user;
              player.user = await UserCache.FromId(id);
              player.user_id = id;

              if (!player.user) {
                player.user = {};
                player.user.display = "unknown";
                if (player.user_id === this.props.user) {
                  player.user.display = "you";
                }
              }

              players[+id] = player;
            }

            this.setState(state => Object.assign({}, state, { players, remaining: data.remaining }));
          }
        },
      });
    }
  }

  componentWillUnmount() {
    if (this.unmount) this.unmount();
  }

  render() {
    var player_view = [];
    if (this.state.remaining !== null) {
      player_view.push(
        <div key="tiles-pool" className="playerSummary">
          <span className="playerSummaryInHand" title="Tiles in Pool">{ this.state.remaining }&nbsp;in&nbsp;pool</span>
        </div>
      );
    }

    if (this.state.players) {
      if (this.state.players[this.props.user.id]) {
        var us = this.state.players[this.props.user.id];
        player_view.push(
          <div key="you-player" className="playerSummary">
            <Avatar src={ gravatarify(us.user) } name="You" size="xlarge" />
            {
              us.playing
              ?
                <span className="playerSummaryInfo">
                  <span className="playerSummaryInHand" title="Tiles in Hand">{ us.in_hand }&nbsp;in&nbsp;hand</span>
                </span>
              :
                <span className="playerSummaryInfo">Spectator</span>
            }
          </div>
        );
      }

      var representative = null;
      var spectators = 0;
      for (let player_id of Object.keys(this.state.players).sort()) {
        if (+player_id === this.props.user.id) {
          continue;
        }

        let them = this.state.players[player_id];
        if (!them.playing) {
          spectators += 1;
          representative = them;
          continue;
        }

        player_view.push(
          <div key={ "player"+player_id } className="playerSummary">
            <Avatar src={ gravatarify(them.user) } name={ them.user.display } size="xlarge" />
            {
              them.playing
              ?
                <span className="playerSummaryInfo">
                  <span className="playerSummaryInHand" title="Tiles in Hand">{ them.in_hand }&nbsp;in&nbsp;hand</span>
                </span>
              :
                <span className="playerSummaryInfo">Spectator</span>
            }
          </div>
        );
      }

      if (spectators === 1) {
        player_view.push(
          <div key="spectator" className="playerSummary">
            <Avatar src={ gravatarify(representative.user) } name={ representative.user.display } size="xlarge" />
            <span className="playerSummaryInfo">Spectator</span>
          </div>
        );
      } else if (spectators > 1) {
        player_view.push(
          <div key="spectators" className="playerSummary">
            <AvatarGroup dense>
              <Avatar src={ gravatarify(representative.user) } name={ representative.user.display } size="xlarge" />
              <AvatarCount size="xlarge" overflow value={ spectators - 1 } />
            </AvatarGroup>
            <span className="playerSummaryInfo">Spectators</span>
          </div>
        );
      }
    }

    return (
      <div style={{ width: "80%" , margin: "0 auto 0.5em auto" }}>
        <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
          <div className="text-left scrollable-x">
            <b>Rush!</b>
            { player_view }
          </div>
        </c.Card>
      </div>
    );
  }
}

class RushGamePage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      countdown: null,
    };

    this.game = loadGame(this.props.game);
    this.props.setGame(this.game);

    let personalize = async (usr) => usr === this.props.user.id ? "You" : (await UserCache.FromId(usr)).display;
    if (this.game) {
      this.state.interface = this.game.interface;
      this.unmount = addEv(this.game, {
        "started": data => {
          this.props.setNotification("Starting!");
          setTimeout(() => this.props.setNotification(null, "Starting!"), 2000);
          window.scrollTo(0, 0);
          data.message = "Let the games begin!";
          notify(this.props.snackbar, data.message, data.type);
          this.props.game.lifecycle = "playing";
          let page = this.props.room ? "/room/game/" + this.props.game.id : "/game";
          this.props.setPage(page, true);
        },
        "countdown": data => {
          this.props.setNotification(data.value + "...");
          window.scrollTo(0, 0);
          data.message = "Game starting in " + data.value;
          this.setState(state => Object.assign({}, state, { countdown: data.value }));
          setTimeout(() => this.setState(state => Object.assign({}, state, { countdown: null })), 1000);
          this.state.interface.controller.wsController.send({'message_type': 'countback', 'value': data.value});

        },
        "draw": async (data) => {
          data.message = await personalize(data.drawer) + " drew!";
          notify(this.props.snackbar, data.message, data.type);
        },
        "finished": async (data) => {
          data.message = await personalize(data.winner) + " won!";
          notify(this.props.snackbar, data.message, data.type);
          this.game.winner = data.winner;
          let page = this.props.room ? "/room/game/" + this.props.game.id : "/game";
          this.props.setPage(page, true);
        },
        "": data => {
          if (data.message) {
            notify(this.props.snackbar, data.message, data.type);
          }
        },
      });
    }
  }
  componentDidMount() {
    this.props.setImmersive(true);
  }
  componentWillUnmount() {
    if (this.unmount) this.unmount();
    this.props.setImmersive(false);
  }
  render() {
    var countdown = null;
    if (this.state.countdown !== null && this.state.countdown !== 0) {
      countdown = <div className="countdown-overlay">
        <div className="countdown-circle">
          { this.state.countdown }
        </div>
      </div>
    }

    return (
      <div>
        { countdown }
        <RushGameSynopsis {...this.props} />
        <RushGameComponent interface={ this.state.interface } notify={ (...arg) => notify(this.props.snackbar, ...arg) } />
      </div>
    );
  }
}

class RushAfterPartyPage extends React.Component {
  constructor(props) {
    super(props);
    this.game = loadGame(this.props.game);
    this.state = {
      snapshots: null,
      winner: this.game.winner,
      finished: false,
      message: "Loading results...",
      timeout: killable(() => { this.refreshData() }, 5000),
    };

    GameCache.Invalidate(this.props.game.id);

    this.unmount = addEv(this.game, {
      "game-state": async (data) => {
        var winner = null;
        if (data.winner && data.winner !== 0) {
          winner = await UserCache.FromId(data.winner);
        }

        var snapshots = [];
        for (let snapshot_index in data.player_data) {
          let snapshot_data = data.player_data[snapshot_index];
          let snapshot = {};
          snapshot.user = await UserCache.FromId(data.player_map[snapshot_index]);
          snapshot.interface = new RushGame(this.game, true);
          snapshot.interface.data = RushData.deserialize(snapshot_data);
          snapshot.interface.data.grid.padding(0);
          snapshot.interface.data.check({ unwords: snapshot_data.unwords });
          snapshots.push(snapshot);
        }

        if (!data.winner) {
          data.winner = 0;
        }

        snapshots.sort((a,b) => (
          (-(a.user.display === data.winner.display) - - (b.user.display === data.winner.display)) ||
          (a.interface.data.bank.length - b.interface.data.bank.length) ||
          (a.interface.data.grid.components().length - b.interface.data.grid.components().length) ||
          (a.interface.data.unwords.length - b.interface.data.unwords.length)
        ));

        // HACK: When refreshData() is called from the button, we don't redraw
        // the screen even though new data is sent. Use snapshots to send only
        // the data we care about.
        this.setState(state => Object.assign({}, state, { snapshots: [] }));
        this.setState(state => Object.assign({}, state, { snapshots: snapshots, winner: winner, finished: data.finished }));

        if (data.finished) {
          if (this.state.timeout) {
            this.state.timeout.kill();
          }

          this.setState(state => Object.assign({}, state, { timeout: null }));

          if (this.props.game?.interface) {
            this.props.game.interface.close();
            this.props.game.interface = null;
          }
        }
      },
      "error": (data) => {
        var message = "Unable to load game data.";
        if (data.error) {
          message = data.error;
        }

        notify(this.props.snackbar, message, data.message_type);
        this.setState(state => Object.assign({}, state, { message }));
      },
      "": data => {
        if (data.message) {
          notify(this.props.snackbar, data.message, data.message_type);
        }
      },
    });
  }
  componentDidMount() {
    this.state.timeout.exec();
  }
  componentWillUnmount() {
    this.props.setGame(null);

    if (this.state.timeout) {
      this.state.timeout.kill();
    }

    if (this.unmount) this.unmount();
  }
  refreshData() {
    this.game.interface.controller.wsController.send({"message_type": "peek"});

    if (this.state.finished) {
      this.state.timeout.kill();
      if (this.props.game?.interface) {
        this.props.game.interface.close();
        this.props.game.interface = null;
      }
      this.setState(state => Object.assign({}, state, { timeout: null }));
    }
  }
  returnToRoom() {
    if (this.props.game.interface) {
      this.props.game.interface.close();
    }

    this.props.game.interface = null;

    this.props.setGame(null);
    this.props.setPage("room", true);
  }
  render() {
    var configuration = <div style={{ width: "90%" , margin: "0 auto 0.5em auto" }}>
      <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
        <div className="text-center">
          <h3>Game Configuration</h3>
          <l.List>
            <l.CollapsibleList handle={
                <l.SimpleListItem text={ <b>Configuration</b> } metaIcon="chevron_right" />
              }
            >
              <CreateGameForm {...this.props} editable={ false } />
            </l.CollapsibleList>
          </l.List>
        </div>
      </c.Card>
    </div>;

    return (
      <>
        <RushGameSynopsis {...this.props} />
        <div>
          { this.state.finished && this.state.winner
          ? <h1>{ this.state.winner.id === this.props.user.id ? "You" : this.state.winner.display } won!</h1>
          : <h1>Please wait while the game finishes...</h1>
          }
          { this.state.finished
            ? <h2>That was fun, wasn't it?</h2>
            : <></>
          }
          {
            this.props.room ? <Button onClick={ () => this.returnToRoom() } raised >Return to Room</Button> : <></>
          }
          {
            !this.state.finished ? <span className="leftpad"><Button onClick={ () => this.state.timeout.exec() } raised >Look again!</Button></span> : <></>
          }
          <ol className="results">
            { this.state.snapshots
            ? this.state.snapshots.map(snapshot =>
                <li key={ snapshot.user.display }>
                  <h1>{ snapshot.user.display }</h1>
                  <RushGameComponent interface={ snapshot.interface } readOnly={ true } />
                </li>
              )
            : <p>{ this.state.message }</p>
            }
          </ol>
          <g.Grid fixedColumnWidth={ true }>
            <g.GridCell align="left" span={3} tablet={8} />
            <g.GridCell align="right" span={6} tablet={8}>
              { configuration }
            </g.GridCell>
          </g.Grid>
        </div>
      </>
    );
  }
}

export {
  RushGamePage,
  RushAfterPartyPage,
}
