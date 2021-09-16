import React from 'react';

import '../../main.scss';

import * as c from '@rmwc/card';
import '@rmwc/card/styles';
import * as l from '@rmwc/list';
import '@rmwc/list/styles';
import * as g from '@rmwc/grid';
import '@rmwc/grid/styles';

import { loadGame, addEv, notify, CreateGameForm } from '../games.js';
import { UserCache } from '../../utils/cache.js';

import { EightJacksAfterPartyComponent } from './eightjacks/afterparty.js';
import { EightJacksGameComponent } from './eightjacks/component.js';
import { EightJacksGameSynopsis } from './eightjacks/synopsis.js';
import { GinAfterPartyComponent } from './gin/afterparty.js';
import { GinGameComponent } from './gin/component.js';
import { GinGameSynopsis } from './gin/synopsis.js';
import { HeartsAfterPartyComponent } from './hearts/afterparty.js';
import { HeartsGameComponent } from './hearts/component.js';
import { HeartsGameSynopsis } from './hearts/synopsis.js';
import { RushAfterPartyComponent } from './rush/afterparty.js';
import { RushGameComponent } from './rush/component.js';
import { RushGameSynopsis } from './rush/synopsis.js';
import { SpadesAfterPartyComponent } from './spades/afterparty.js';
import { SpadesGameComponent } from './spades/component.js';
import { SpadesGameSynopsis } from './spades/synopsis.js';
import { ThreeThirteenAfterPartyComponent } from './threethirteen/afterparty.js';
import { ThreeThirteenGameComponent } from './threethirteen/component.js';
import { ThreeThirteenGameSynopsis } from './threethirteen/synopsis.js';

var layouts = {
  "eight jacks": {
    configuration: true,
    finished_synopsis: true,
    immersive: false,
    synopsis: EightJacksGameSynopsis,
    player: EightJacksGameComponent,
    afterparty: EightJacksAfterPartyComponent,
  },
  "gin": {
    configuration: true,
    finished_synopsis: false,
    immersive: false,
    synopsis: GinGameSynopsis,
    player: GinGameComponent,
    afterparty: GinAfterPartyComponent,
  },
  "hearts": {
    configuration: true,
    finished_synopsis: false,
    immersive: false,
    synopsis: HeartsGameSynopsis,
    player: HeartsGameComponent,
    afterparty: HeartsAfterPartyComponent,
  },
  "rush": {
    configuration: true,
    finished_synopsis: true,
    immersive: true,
    synopsis: RushGameSynopsis,
    player: RushGameComponent,
    afterparty: RushAfterPartyComponent,
  },
  "spades": {
    configuration: true,
    finished_synopsis: false,
    immersive: false,
    synopsis: SpadesGameSynopsis,
    player: SpadesGameComponent,
    afterparty: SpadesAfterPartyComponent,
  },
  "three thirteen": {
    configuration: true,
    finished_synopsis: false,
    immersive: false,
    synopsis: ThreeThirteenGameSynopsis,
    player: ThreeThirteenGameComponent,
    afterparty: ThreeThirteenAfterPartyComponent,
  },
};

class DispatchingGamePage extends React.Component {
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
          data.message = await Promise.all(data.winners.map(personalize)) + " won!";
          notify(this.props.snackbar, data.message, data.type);
          this.props.game.winners = data.winners;
          this.props.game.lifecycle = "finished";
          let page = this.props.room ? "/room/game/" + this.props.game.id : "/game";
          this.props.setPage(page, true);
        },
        "error": data => {
          notify(this.props.snackbar, data.error, "error");
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
    if (this.pageLayout().immersive) {
      this.props.setImmersive(true);
    }
  }
  componentWillUnmount() {
    if (this.unmount) this.unmount();
    if (this.pageLayout().immersive) {
      this.props.setImmersive(false);
    }
  }
  pageLayout() {
    var mode = this.props.game.mode || this.props.game.style;
    return layouts[mode];
  }
  render() {
    var layout = this.pageLayout();
    if (layout === undefined) {
      var mode = this.props.game.mode || this.props.game.style;
      return "Unrecognized game mode: " + mode;
    }

    var countdown_element = null;
    if (this.state.countdown !== null && this.state.countdown !== 0) {
      countdown_element = <div className="countdown-overlay">
        <div className="countdown-circle">
          { this.state.countdown }
        </div>
      </div>
    }

    var configuration_element = null;
    if (layout.configuration) {
      configuration_element = <div style={{ width: "90%" , margin: "0 auto 0.5em auto" }}>
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
    }

    let subcomponent_props = {...this.props};
    subcomponent_props.game = this.game;
    subcomponent_props.interface = this.state.interface;
    subcomponent_props.notify = (...arg) => notify(this.props.snackbar, ...arg);

    let synopsis_element = null;
    if (this.props.game?.lifecycle !== "finished" || layout.finished_synopsis) {
      synopsis_element = React.createElement(layout.synopsis, subcomponent_props, this.props.children);
    }

    let game_component = null;
    if (this.props.game?.spectating || this.props.game?.lifecycle === "finished") {
      game_component = React.createElement(layout.afterparty, subcomponent_props, this.props.children);
    } else {
      game_component = React.createElement(layout.player, subcomponent_props, this.props.children);
    }

    return (
      <div>
        { countdown_element }
        { synopsis_element }
        { game_component }
        {
          layout.configuration
          ?
            <g.Grid fixedColumnWidth={ true }>
              <g.GridCell align="left" span={3} tablet={8} />
              <g.GridCell align="right" span={6} tablet={8}>
                { configuration_element }
              </g.GridCell>
            </g.Grid>
          : null
        }
      </div>
    );
  }
}

export {
  DispatchingGamePage
};
