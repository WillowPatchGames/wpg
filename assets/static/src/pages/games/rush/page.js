// Library imports
import React from 'react';

// Application imports
import { RushGameComponent } from './component.js';

import { loadGame, addEv, notify } from '../../games.js';
import { UserCache } from '../../../utils/cache.js';

import { RushGameSynopsis } from './synopsis.js';

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
          this.props.game.spectating = !data.playing;
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

export {
  RushGamePage
};
