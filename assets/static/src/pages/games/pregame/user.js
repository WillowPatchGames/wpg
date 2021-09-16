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
import { Switch } from '@rmwc/switch';
import '@rmwc/switch/styles';

// Application imports
import '../../../App.css';
import { loadGame, addEv, notify } from '../common.js';
import { CreateGameForm } from '../config.js';
import { UserCache } from '../../../utils/cache.js';
import { CancellableButton } from '../../../utils/cancellable.js';

class PreGameUserPage extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      status: "pending",
      players: null,
      countdown: null,
      ready: this.getAutoReadyState(),
      queue: [],
      bind_requests: [],
    }

    this.game = this.props.game || {};
    this.props.setGame(loadGame(this.game));

    let personalize = async (usr) => usr === this.props.user.id ? "You" : (await UserCache.FromId(usr)).display;
    this.unmount = addEv(this.game, {
      "admitted": async (data) => {
        await this.game.update();
        if (data.admitted) {
          this.setState(state => Object.assign({}, this.state, { status: "waiting" }));
        } else {
          this.setState(state => Object.assign({}, this.state, { status: "pending", players: null }));
        }
      },
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
        let message = {'message_type': 'countback', 'value': data.value};
        if (this.state.ready) {
          this.game.interface.controller.wsController.send(message);
        } else {
          this.state.queue.push(message);
          this.setState(state => Object.assign({}, state, { queue: this.state.queue }));
        }
      },
      "notify-users": async (data) => {
        if (data && data.players) {
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

          this.setState(state => Object.assign({}, state, { players }));
        }
      },
      "notify-bind": async(data) => {
        let bind_requests = [data.initiator_id];
        for (let existing_request of this.state.bind_requests) {
          bind_requests.push(existing_request);
        }

        this.setState(state => Object.assign({}, state, { bind_requests }));
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

    if (this.props.user?.config?.auto_ready && typeof document.hidden !== undefined) {
      this.game.interface.controller.wsController.waitOpen().then(() => {
        this.game.interface.controller.markReady(this.getAutoReadyState());
      }, (err) => console.log(err));

      let old_umount = this.unmount;
      let ready_handler = () => {
        let ready = this.getAutoReadyState();
        this.game.interface.controller.markReady(ready);

        let queue = this.state.queue;
        if (ready && queue.length > 0) {
          for (let message of queue) {
            this.game.interface.controller.wsController.send(message);
          }

          queue = [];
        }

        this.setState(state => Object.assign({}, state, { ready, queue }));
      }
      document.addEventListener("visibilitychange", ready_handler);
      this.unmount = function() {
        old_umount();
        document.removeEventListener("visibilitychange", ready_handler);
      }
    }
  }
  componentWillUnmount() {
    if (this.unmount) this.unmount();
  }
  getAutoReadyState() {
    if (this.props.user?.config?.auto_ready && typeof document.hidden !== undefined) {
      return !document.hidden;
    }

    return false;
  }
  toggleSpectator(user) {
    for (let u in this.state.players) {
      if (this.state.players[u] === user) {
        user.playing = !user.playing;

        this.game.interface.controller.admitPlayer(user.user_id, true, user.playing);
      }
    }

    this.setState(state => Object.assign({}, state, { players: this.state.players }));
  }
  toggleReady(user, ready_state) {
    var ready = false;
    for (let u in this.state.players) {
      if (this.state.players[u] === user) {
        if (ready_state === undefined) {
          user.ready = !user.ready;
          ready = user.ready;
        } else {
          user.ready = ready_state;
          ready = ready_state;
        }

        this.game.interface.controller.markReady(user.ready);
      }
    }

    let queue = this.state.queue;
    if (ready && queue.length > 0) {
      for (let message of queue) {
        this.game.interface.controller.wsController.send(message);
      }

      queue = [];
    }

    this.setState(state => Object.assign({}, state, { players: this.state.players, ready, queue }));
  }
  async bindToSpectator(spectator) {
    let response = await this.game.interface.controller.bindToSpectator(spectator.user_id);
    if (response) {
      notify(this.props.snackbar, response.message, response.type);
    }
  }
  async acceptBindToPlayer(player) {
    let response = await this.game.interface.controller.acceptBind(player.user_id);
    if (!response) {
      let bind_requests = [];
      for (let remaining_request of this.state.bind_requests) {
        if (remaining_request !== player.user_id) {
          bind_requests.push(remaining_request);
        }
      }

      this.setState(state => Object.assign({}, state, { bind_requests }));
    } else {
      notify(this.props.snackbar, response.message, response.type);
    }
  }
  async unbindPeer(spectator) {
    let response = await this.game.interface.controller.unbindPeer(spectator.user_id);
    if (response) {
      notify(this.props.snackbar, response.message, response.type);
    }
  }
  render() {
    let message = "Game is in an unknown state.";
    if (this.state.status === "pending") {
      message = "Please wait to be admitted to the game.";
    } else if (this.state.status === "waiting") {
      message = "Waiting for the game to start...";
    }

    let us = null;
    let users = [];
    if (this.state.players !== null) {
      var i = 0;
      for (let player_id of Object.keys(this.state.players).sort()) {
        let player = this.state.players[player_id];
        if (+player_id === +this.props.user.id) {
          us = player;
        }
      }

      for (let player_id of Object.keys(this.state.players).sort()) {
        let player = this.state.players[player_id];
        let display = player.user.display;
        let disabled = true;
        let onClick = undefined;
        if (+player_id === +this.props.user.id) {
          display = "You";
          disabled = false;
          onClick = () => this.toggleSpectator(player);
        }

        users.push(
          <l.ListItem key={display} disabled style={{ height: "auto", minHeight: "56px" }}>
            <span className="unselectable">{+i + 1}.&nbsp;</span> {display}
            <l.ListItemMeta>
              <span className="leftpad">
                <Switch checked={ player.playing } label={ player.playing ? "Player" : "Spectator" } disabled={ disabled } onClick={ onClick } />
                {
                  us.playing && player !== us && !player.playing
                  ?
                    !us?.bound_players?.includes(player.user_id)
                    ?
                      <span className="leftpad">
                        <CancellableButton label="Bind" loadingLabel="Binding..." raised submitHandler={ () => this.bindToSpectator(player) } cancelHandler={ () => this.unbindPeer(player) } />
                      </span>
                    :
                      <span className="leftpad">
                        <Button label="Unbind" raised onClick={ () => this.unbindPeer(player) } />
                      </span>
                  : <></>
                }
                {
                  !us.playing && player !== us && player.playing && this.state.bind_requests.includes(player.user_id)
                  ?
                    <span className="leftpad">
                      <Button label="Accept Bind" raised onClick={ () => this.acceptBindToPlayer(player) } />
                    </span>
                  : <></>
                }
                {
                  !us.playing && player !== us && us?.bound_players?.includes(player?.id || player?.user_id)
                  ?
                    <span className="leftpad">
                      <Button label="Unbind" raised onClick={ () => this.unbindPeer(player) } />
                    </span>
                  : <></>
                }
              </span>
            </l.ListItemMeta>
          </l.ListItem>
        );
        i += 1;
      }
    }

    let content = <c.Card>
      <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
        {
          message
          ? <p>
              <b>
                { message }
              </b>
            </p>
          : null
        }
        {
          this.state.status !== "pending"
          ? <>
              {
                us !== null
                ? <>
                    <Button raised label={ us.playing ? "Spectate" : "Play" }
                            onClick={ () => this.toggleSpectator(us) } />
                    <br /><br />
                    <Switch label={ us.ready ? <b style={{ fontSize: "125%" }}>Ready</b> : <b style={{ fontSize: "125%" }}>Not Ready</b> } checked={ us.ready }
                            onChange={ () => this.toggleReady(us) } />
                  </>
                : null
              }
              <l.List>
                <l.CollapsibleList handle={
                    <l.SimpleListItem text={ <b>Configuration</b> } metaIcon="chevron_right" />
                  }
                >
                  <CreateGameForm {...this.props} editable={ false } />
                </l.CollapsibleList>
                <l.ListGroup>
                  <l.ListItem disabled>
                    <b>Users</b>
                  </l.ListItem>
                  { users }
                </l.ListGroup>
              </l.List>
            </>
          : null
        }
      </div>
    </c.Card>;

    var countdown = null;
    if (this.state.countdown !== null && this.state.countdown !== 0) {
      countdown = <div className="countdown-overlay">
        <div className="countdown-circle">
          { this.state.countdown }
        </div>
      </div>
    }

    if (this.props.room === null) {
      return (
        <div>
          { countdown }
          <h1>Game #{ this.props.game.id } - { this.props.game.style }</h1>
          <g.Grid fixedColumnWidth={ true }>
            <g.GridCell align="left" span={3} tablet={8} />
            <g.GridCell align="right" span={6} tablet={8}>
              { content }
            </g.GridCell>
          </g.Grid>
        </div>
      );
    }

    return (
      <div>
        { countdown }
        <h1>Game #{ this.props.game.id } - { this.props.game.style }</h1>
        { content }
      </div>
    );
  }
}

export { PreGameUserPage };
