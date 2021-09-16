// Library imports
import React from 'react';

import { Button } from '@rmwc/button';
import '@rmwc/button/styles';
import * as c from '@rmwc/card';
import '@rmwc/card/styles';
import * as g from '@rmwc/grid';
import '@rmwc/grid/styles';
import * as l from '@rmwc/list';
import '@rmwc/list/styles';

// Application imports
import { RushGame, RushData } from '../../../games/rush.js';
import { RushGameComponent } from './component.js';

import { loadGame, addEv, notify, killable, CreateGameForm } from '../../games.js';
import { UserCache, GameCache } from '../../../utils/cache.js';

import { RushGameSynopsis } from './synopsis.js';

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
  async refreshData() {
    await this.game.interface.controller.wsController.sendAndWait({"message_type": "peek"});

    if (this.state.finished) {
      if (this.state.timeout) {
        this.state.timeout.kill();
        this.setState(state => Object.assign({}, state, { timeout: null }));
      }
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
  RushAfterPartyPage
};
