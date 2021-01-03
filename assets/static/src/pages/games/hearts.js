import React from 'react';

import '../../main.scss';

import { Avatar } from '@rmwc/avatar';
import '@rmwc/avatar/styles';
import { Button } from '@rmwc/button';
import '@rmwc/card/styles';
import * as c from '@rmwc/card';
import '@rmwc/button/styles';
import { CircularProgress } from '@rmwc/circular-progress';
import '@rmwc/circular-progress/styles';
import * as l from '@rmwc/list';
import '@rmwc/list/styles';
import * as g from '@rmwc/grid';
import '@rmwc/grid/styles';
import { Select } from '@rmwc/select';
import '@rmwc/select/styles';
import { Switch } from '@rmwc/switch';
import '@rmwc/switch/styles';

import { CardSuit, CardHand } from '../../games/card.js';
import { loadGame, addEv, notify, killable, CreateGameForm } from '../games.js';
import { UserCache, GameCache } from '../../utils/cache.js';
import { gravatarify } from '../../utils/gravatar.js';

// Properties used for display card hands
var handProps = {
  overlap: true,
  curve: true,
  scale: 0.50,
};

class HeartsGameComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.state.game = props.game;
    this.state.selected = null;
    this.state.pass_select = new Set();
    this.state.pass = null;
    this.state.pass_suggesting = true;
    this.state.last_hand = null;
    // FIXME: hack?
    let old_handler = this.state.game.interface.onChange;
    this.state.game.interface.onChange = () => {
      old_handler();
      this.setState(state => {
        // Jinx
        return state;
      });
    };
  }
  clearSelectAnd(then) {
    return (...arg) => {
      this.setState(state => Object.assign(state, {
        selected: null,
        pass_select: new Set(),
        pass_suggesting: true,
      }));
      return then && then(...arg);
    };
  }
  selecting(card) {
    return Object.assign(card, {
      selected: this.state.selected === card.id,
      onClick: () => {
        this.setState(state => {
          if (state.selected === card.id)
            state.selected = null;
          else
            state.selected = card.id;
          return state;
        });
      },
    });
  }
  selecting_pass(card) {
    return Object.assign(card, {
      selected: this.state.pass_select.has(card.id),
      onClick: () => {
        this.setState(state => {
          if (state.pass_select.has(card.id))
            state.pass_select.delete(card.id);
          else
            state.pass_select.add(card.id);
          return state;
        });
      },
    });
  }
  captureHandAnd(then) {
    return (...arg) => {
      this.setState(state => Object.assign(state, {
        last_hand: this.state.game.interface.data.hand?.cards.map(card => card.id),
      }));
      return then && then(...arg);
    };
  }
  showing_new(card) {
    if (!this.state.last_hand) return;
    return Object.assign(card, {
      selected: !this.state.last_hand.includes(card.id),
      onClick: () => {
        this.setState(state => {
          state.last_hand = null;
          return state;
        });
      },
    });
  }
  render() {
    var status = a => <h3>{ a }</h3>;
    var big_status = a => <h2>{ a }</h2>;
    if (!this.state.game.interface.started) {
      return status("Waiting for game to start …");
    } else if (this.state.game.interface.finished) {
      return <div>
        {status("Finished")}
      </div>;
    } else if (!this.state.game.interface.passed) {
      var pass_direction = "nowhere";
      if (this.props.game.interface.synopsis) {
        if (this.props.game.interface.synopsis.pass_direction === 0) {
          pass_direction = "left";
        } else if (this.props.game.interface.synopsis.pass_direction === 1) {
          pass_direction = "right";
        } else if (this.props.game.interface.synopsis.pass_direction === 2) {
          pass_direction = "accross";
        }
      }
      if (!this.state.game.interface.data.have_passed) {
        return <div>
          <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
            <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
              <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                {status("Please select " + this.state.game.config.number_to_pass + " cards to pass " + pass_direction + ":")}
                <Button label="Pass" raised ripple={false} onClick={this.clearSelectAnd(() =>
                  this.state.game.interface.pass(Array.from(this.state.pass_select)))
                }/>
              </div>
            </c.Card>
          </div>
          <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
              <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
                <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                  <h3>Hand</h3>
                  { this.state.game.interface.data.hand?.toImage(this.selecting_pass.bind(this), handProps) }
                </div>
              </c.Card>
            </div>
        </div>;
      } else {
        return <div>
          <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
            <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
              <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                {status("Waiting for others to finish passing...")}
                { this.state.game.interface.data.incoming ? status("Incoming Cards") : null }
                { this.state.game.interface.data.incoming?.toImage(handProps) }
              </div>
            </c.Card>
          </div>
          <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
              <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
                <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                  <h3>Hand</h3>
                  { this.state.game.interface.data.hand?.toImage(this.selecting_pass.bind(this), handProps) }
                </div>
              </c.Card>
            </div>
        </div>;
      }
    } else {
      var already_played = +this.state.game.interface.data.played.cards.length;
      var num_players = +this.state.game.config.num_players;
      if (this.state.game.interface.my_turn()) {
        var leading = !already_played || already_played >= num_players;
        return <div>
          <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
            <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
              <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                { this.state.game.interface.data.incoming ? status("Incoming Cards") : null }
                { this.state.game.interface.data.incoming?.toImage(handProps) }
                { this.state.game.interface.data.crib?.cards ? status("Crib (First Trick)") : null }
                { this.state.game.interface.data.crib?.toImage(handProps) }
                {status(leading ? (already_played ? "You took it, lead the next trick!" : "You lead off!") : already_played === 1 ? "This card was led" : "These cards have been played")}
                { this.state.game.interface.data.played?.toImage() }
                {big_status("Your turn to play")}
                {status("Choose a card")}
                <Button label={ this.state.selected ? "Play this card" : "Pick a card!" } unelevated ripple={false} disabled={ !this.state.selected }
                  onClick={this.clearSelectAnd(() => this.state.game.interface.play(this.state.selected)) } />
              </div>
            </c.Card>
          </div>
          <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
            <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
              <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                <h3>Hand</h3>
                { this.state.game.interface.data.hand?.toImage(this.selecting.bind(this), handProps) }
              </div>
            </c.Card>
          </div>
        </div>;
      } else {
        return <div>
          <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
            <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
              <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                { this.state.game.interface.data.incoming ? status("Incoming Cards") : null }
                { this.state.game.interface.data.incoming?.toImage(handProps) }
                { this.state.game.interface.data.crib?.cards ? status("Crib (First Trick)") : null }
                { this.state.game.interface.data.crib?.toImage(handProps) }
                { status(this.state.game.interface.data.played.cards.length === num_players ? "Last Trick" : "Current Trick") }
                { this.state.game.interface.data.played?.toImage() }
                {status("Waiting for the other player" + (num_players < 3 ? "" : "s") + " to play …")}
              </div>
            </c.Card>
          </div>
          <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
            <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
              <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                <h3>Hand</h3>
                { this.state.game.interface.data.hand?.toImage(this.selecting.bind(this), handProps) }
              </div>
            </c.Card>
          </div>
        </div>;
      }
    }
  }
}

class HeartsGameSynopsis extends React.Component {
  constructor(props) {
    super(props);

    this.state = this.newState();

    let old_handler = this.props.game.interface.onChange;
    this.props.game.interface.onChange = () => {
      old_handler();
      this.setState(state => this.newState());
    };
  }

  newState() {
    let new_state = { indexed_players: {}, spectators: {}, suit: undefined };

    if (this.props.game.interface.synopsis && this.props.game.interface.synopsis.players) {
      for (let player of this.props.game.interface.synopsis.players) {
        if (player.player_index !== -1) {
          new_state.indexed_players[player.player_index] = player;
        } else {
          new_state.spectators[player.player_index] = player;
        }
      }
    }
    if (this.props.game.interface.data && this.props.game.interface.data.played) {
      var i = this.props.game.interface;
      if (i.passded && i.dealt && !i.finished) {
        var num_played = this.props.game.interface.data.played.cards.length;
        var num_players = this.props.game.interface.data.config.num_players;
        if (num_played > 0 && num_played < num_players) {
          new_state.suit = this.props.game.interface.data.played.cards[0].suit;
        } else {
          new_state.suit = "waiting";
        }
      } else if (!i.finished) {
        new_state.suit = i.dealt ? "passding" : "dealing";
      }
    }

    return new_state;
  }

  render() {
    var sigil = (t,c) => <span style={{ fontSize: "170%", color: c }}>{ t }</span>
    var synopsis_columns = {
      "user":{
        name: "User",
        printer: (user,player) =>
          <Avatar src={ gravatarify(user) } name={ user.display }
            style={{ border: "2px solid "+(player.is_turn ? "#2acc0c" : "#FFFFFF00") }}
            size={ user.id === this.props.user.id ? "xlarge" : "large" } />,
      },
      "is_leader":{
        name: "Lead",
        printer: (is_leader,player,state) =>
          !is_leader || !state.suit
          ? ""
          : state.suit instanceof CardSuit
          ? sigil(state.suit.toUnicode() || "♤", state.suit.toColor())
          : state.suit === "waiting"
          ? <CircularProgress size="xsmall" style={{ color: "#558abf" }} />
          : sigil("♠"),
      },
      "is_dealer":{
        name: "Dealer",
        printer: a => a ? sigil("♠") : "",
      },
      "tricks":"Tricks",
      "round_score":"Round Score",
      "score":"Score",
    };

    var tabulate = columns => data => {
      if (!data) return [null];
      var rows = [];
      for (let dat of data) {
        rows.push([]);
        for (let k in columns) {
          var printer = a => a;
          if (typeof columns[k] === "object") printer = columns[k].printer;
          rows[rows.length-1].push(<td key={ k }>{ printer(dat[k],dat,this.state) }</td>)
        }
      }
      return rows.map((row, i) => <tr key={ data[i].user.id }>{row}</tr>);
    };

    var headings = [];
    for (let k in synopsis_columns) {
      var name = synopsis_columns[k];
      if (typeof name === "object") name = name.name;
      headings.push(<th key={ k }>{ name }</th>);
    }

    var player_rows = [];
    if (this.state.indexed_players) {
      var remaining = [];

      for (let player_index of Object.keys(this.state.indexed_players).sort()) {
        let player = this.state.indexed_players[player_index];
        remaining.push(player);
      }

      player_rows.push(...tabulate(synopsis_columns)(remaining));
    }

    var player_view = null;
    if (player_rows) {
      player_view = <table style={{ "textAlign": "center" }}>
        <tbody>
          <tr key={ "hearts_synopsis_headings" }>
            { headings }
          </tr>
          { player_rows }
        </tbody>
      </table>
    }

    var pass_direction = "Holding";
    if (this.props.game.interface.synopsis) {
      if (this.props.game.interface.synopsis.pass_direction === 0) {
        pass_direction = "Passing Left";
      } else if (this.props.game.interface.synopsis.pass_direction === 1) {
        pass_direction = "Passing Right";
      } else if (this.props.game.interface.synopsis.pass_direction === 2) {
        pass_direction = "Passing Accross";
      }
    }

    if (this.props.game.lifecycle === "finished") {
      pass_direction = null;
    }

    return (
      <div className="fit-content" style={{ margin: "0 auto 1em auto" }}>
        <c.Card className="fit-content" style={{ padding: "0.5em 0.5em 0.5em 0.5em" }}>
          <div className="scrollable-x">
            <h1 style={{ marginBottom: pass_direction ? 0 : null, color: "#bd2525" }}>Hearts</h1>
            { pass_direction ? <span style={{ fontStyle: "italic" }}>{ pass_direction }</span> : <></> }
            { player_view }
          </div>
        </c.Card>
      </div>
    );
  }
}

class HeartsGamePage extends React.Component {
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
          data.message = "Let the games begin!";
          notify(this.props.snackbar, data.message, data.type);

          if (!data.playing) {
            this.props.setPage('afterparty', true);
          }
        },
        "countdown": data => {
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
          this.props.setPage('afterparty', true);
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
    //this.props.setImmersive(true);
  }
  componentWillUnmount() {
    if (this.unmount) this.unmount();
    //this.props.setImmersive(false);
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
        <HeartsGameSynopsis game={ this.game } {...this.props} />
        <HeartsGameComponent game={ this.game } interface={ this.state.interface } notify={ (...arg) => notify(this.props.snackbar, ...arg) } />
      </div>
    );
  }
}

class HeartsAfterPartyPage extends React.Component {
  constructor(props) {
    super(props);
    this.game = loadGame(this.props.game);
    this.state = {
      player_mapping: null,
      history: null,
      historical_round: "0",
      show_dealt: false,
      active: {
        turn: null,
        leader: null,
        dealer: null,
        pass_direction: null,
        played: null,
        who_played: null,
        hearts_broken: false,
        played_history: null,
      },
      winner: this.game.winner,
      dealt: false,
      passed: false,
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

        if (!data.winner) {
          data.winner = 0;
        }

        var mapping = {};
        for (let index in data.player_mapping) {
          mapping[index] = await UserCache.FromId(data.player_mapping[index]);
        }

        var history = null;
        if (data.round_history) {
          history = {
            scores: [],
            players: [],
            tricks: [],
          };

          for (let round of data.round_history) {
            var round_scores = {};
            var info = {};
            var num_players = round.players.length;

            // Data corruption bug fix.
            var have_nonzero = false;
            for (let player of round.players) {
              if (player?.passed_from !== null && player?.passed_from !== undefined && player.passed_from !== 0) {
                have_nonzero = true;
                break;
              }
            }

            for (let player_index in round.players) {
              let player = round.players[player_index];
              if (!have_nonzero || player?.passed_to === null || player?.passed_to === undefined || player?.passed_from === null || player?.passed_from === undefined) {
                let passed_to = null;
                let passed_from = null;
                if (round.pass_direction === 0) {
                  passed_to = (player_index + 1) % num_players;
                  passed_from = (player_index + num_players - 1) % num_players;
                } else if (round.pass_direction === 1) {
                  passed_to = (player_index + num_players - 1) % num_players;
                  passed_from = (player_index + 1) % num_players;
                } else if (round.pass_direction === 2) {
                  passed_to = (player_index + parseInt(num_players/2)) % num_players;
                  passed_from = (player_index + parseInt(num_players/2)) % num_players;
                }
                player.passed_to = passed_to;
                player.passed_from = passed_from;
              }

              round_scores[player_index] = {
                'user': mapping[player_index],
                'tricks': player.tricks,
                'round_score': player.round_score,
                'score': player.score,
              };
              info[player_index] = {
                'dealt_hand': player?.dealt_hand ? player?.dealt_hand : player?.hand,
                'played_hand': player?.played_hand,
                'passed': player?.passed,
                'got_passed': player?.got_passed,
                'passed_to': player?.passed_to !== null && player?.passed_to !== undefined ? { index: player.passed_to , user: mapping[player.passed_to] } : null,
                'passed_from': player?.passed_from !== null && player?.passed_from !== undefined ? { index: player.passed_from , user: mapping[player.passed_from] } : null,
              }
            }

            history.scores.push(round_scores);
            history.players.push(info);

            console.log(round.tricks);
            history.tricks.push(round.tricks);
          }
        }

        // HACK: When refreshData() is called from the button, we don't redraw
        // the screen even though new data is sent. Use snapshots to send only
        // the data we care about.
        this.setState(state => Object.assign({}, state, { history: null }));
        this.setState(state => Object.assign({}, state, {
          player_mapping: mapping,
          history: history,
          winner: winner,
          dealt: data.dealt,
          passed: data.passed,
          finished: data.finished,
        }));

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
  refreshData() {
    this.game.interface.controller.wsController.send({"message_type": "peek"});
  }
  returnToRoom() {
    if (this.props.game.interface) {
      this.props.game.interface.close();
    }

    this.props.game.interface = null;

    this.props.setGame(null);
    this.props.setPage("room");
  }

  render() {
    var historical_data = null;
    var scoreboard_data = null;

    if (this.state.history) {
      let round_index = parseInt(this.state.historical_round);
      let round_data = <b>No data found for round { round_index + 1 }!</b>;
      if (this.state.history.players[round_index]) {
        let round_players = this.state.history.players[round_index];
        let num_players = Object.keys(round_players).length;
        round_data = [<b>Data for round { round_index + 1}</b>];
        let hands_data = [];
        for (let player_index in this.state.history.players[round_index]) {
          let user = this.state.player_mapping[player_index];
          let player = round_players[player_index];
          let dealt_hand = player?.dealt_hand ? CardHand.deserialize(player.dealt_hand).cardSort(true, true) : null;
          let played_hand = player?.played_hand ? CardHand.deserialize(player.played_hand).cardSort(true, true) : null;
          let passed = player?.passed ? CardHand.deserialize(player.passed).cardSort(true, true) : null;
          let got_passed = player?.got_passed ? CardHand.deserialize(player.got_passed).cardSort(true, true) : null;
          let hand_name = "Dealt Hand";
          if (passed && !this.state.show_dealt) {
            hand_name = "Played Hand";
            dealt_hand = played_hand;
          }
          hands_data.push(
            <div>
              <b>{ user.display }</b>
              <l.List>
                <l.CollapsibleList handle={
                    <l.SimpleListItem text={ <b>{ hand_name }</b> } metaIcon="chevron_right" />
                  }
                >
                  <div style={{ paddingTop: '15px', paddingBottom: '15px' }}>
                    { dealt_hand ? dealt_hand.toImage(handProps) : null }
                  </div>
                </l.CollapsibleList>
                {
                  passed
                  ? <>
                      <l.CollapsibleList handle={
                          <l.SimpleListItem text={ <b>Cards Passed to { player.passed_to.user.display }</b> } metaIcon="chevron_right" />
                        }
                      >
                        <div style={{ paddingTop: '15px', paddingBottom: '15px' }}>
                          { passed ? passed.toImage(handProps) : null }
                        </div>
                      </l.CollapsibleList>
                      <l.CollapsibleList handle={
                          <l.SimpleListItem text={ <b>Cards Passed from { player.passed_from.user.display }</b> } metaIcon="chevron_right" />
                        }
                      >
                        <div style={{ paddingTop: '15px', paddingBottom: '15px' }}>
                          { got_passed ? got_passed.toImage(handProps) : null }
                        </div>
                      </l.CollapsibleList>
                    </>
                  : null
                }
              </l.List>
            </div>
          );
        }
        round_data.push(
          <l.CollapsibleList handle={
              <l.SimpleListItem text={ <b>Player Hands</b> } metaIcon="chevron_right" />
            }
          >
            <div style={{ textAlign: 'center' }}>
              { hands_data }
            </div>
          </l.CollapsibleList>
        );

        if (this.state.history.tricks[round_index]) {
          let tricks_data = [];
          for (let trick_index in this.state.history.tricks[round_index]) {
            let trick = this.state.history.tricks[round_index][trick_index];
            let leader = this.state.player_mapping[trick.leader];
            let winner = this.state.player_mapping[trick.winner];
            let leader_line = null;
            let winner_line = null;
            if (leader) {
              leader_line = <><b>Leader</b>: <Avatar src={ gravatarify(leader) } name={ leader.display } size="medium" /> { leader.display }<br /></>
            }
            if (winner) {
              winner_line = <><b>Winner</b>: <Avatar src={ gravatarify(winner) } name={ winner.display } size="medium" /> <b>{ winner.display }</b><br /></>
            }
            let annotations = [];
            if (leader) {
              for (let offset = 0; offset < num_players; offset++) {
                let annotation_player_index = (trick.leader + offset) % num_players;
                let annotation_player = this.state.player_mapping[annotation_player_index];
                let annotation = <><Avatar src={ gravatarify(annotation_player) } name={ annotation_player.display } size="medium" /> { annotation_player.display }</>;
                if (annotation_player_index === trick.winner) {
                  annotation = <><Avatar src={ gravatarify(annotation_player) } name={ annotation_player.display } size="medium" /> <b>{ annotation_player.display }</b></>;
                }
                annotations.push(annotation);
              }
            }
            let cards = trick?.played ? CardHand.deserialize(trick.played).toImage(null, null, annotations) : null;
            tricks_data.push(
              <l.CollapsibleList handle={
                  <l.SimpleListItem text={ <b>Trick { parseInt(trick_index) + 1 }</b> } metaIcon="chevron_right" />
                }
              >
                <div style={{ textAlign: 'left' }}>
                  { leader_line }
                  { winner_line }
                </div>
                { cards }
              </l.CollapsibleList>
            );
          }

          round_data.push(
            <l.CollapsibleList handle={
                <l.SimpleListItem text={ <b>Tricks</b> } metaIcon="chevron_right" />
              }
            >
              <div style={{ textAlign: 'center' }}>
                <l.List>
                  { tricks_data }
                </l.List>
              </div>
            </l.CollapsibleList>
          );
        }
      }

      historical_data = <div style={{ width: "90%" , margin: "0 auto 0.5em auto" }}>
        <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
          <div className="text-left">
            <h3>Game Analysis</h3>
            <l.List style={{ maxWidth: "15em" }}>
              <l.ListGroup>
                <Select
                  label="Choose a Round" enhanced
                  value={ this.state.historical_round }
                  onChange={ (e) => this.setState(Object.assign({}, this.state, { historical_round: e.target.value })) }
                  options={ Object.keys(this.state.history.players).map(x => ({ label: 'Round ' + (parseInt(x) + 1), value: x })) }
                />
                <Switch
                  label={ this.state.show_dealt ? "Show Dealt Hand" : "Show Played Hand" }
                  name="show_dealt"
                  checked={ this.state.show_dealt }
                  onChange={ () => this.setState(Object.assign({}, this.state, { show_dealt: !this.state.show_dealt })) }
                />
              </l.ListGroup>
            </l.List>
            <l.List>
              { round_data }
            </l.List>
          </div>
        </c.Card>
      </div>;

      var score_players = [];
      var round_scores = [];
      var final_scores = [];
      for (let player_index of Object.keys(this.state.player_mapping).sort()) {
        let score_player = this.state.player_mapping[player_index];
        score_players.push(<td colspan={2} style={{ borderBottom: "1px solid #777", paddingLeft: '25px', paddingRight: '25px' }}><Avatar src={ gravatarify(score_player) } name={ score_player.display } size="medium" /> { score_player.display }</td>);
      }
      for (let round_index in this.state.history.scores) {
        let round_row = [];
        round_row.push(<td style={{ borderTop: "10px solid transparent", borderBottom: "10px solid transparent" }}> { parseInt(round_index) + 1 } </td>);
        for (let player_index of Object.keys(this.state.player_mapping).sort()) {
          let round_score = parseInt(this.state.history.scores[round_index][player_index].round_score);
          let score = parseInt(this.state.history.scores[round_index][player_index].score);
          let score_display = <span style={{ fontSize: '75%' }}> = { score } </span>;

          if (parseInt(round_index) === (this.state.history.scores.length - 1)) {
            if (+this.state.player_mapping[player_index].id === +this.state.winner.id) {
              final_scores.push(<td colspan={2} style={{ borderTop: "1px solid #000" }}> <b> { score } </b> </td>);
            } else {
              final_scores.push(<td colspan={2} style={{ borderTop: "1px solid #000" }}> { score } </td>);
            }
            score_display = null;
          }

          let entry = '-';
          let incr = !isNaN(round_score) && round_score < 0 ? ""+round_score : "+"+round_score
          entry = <>
            <td style={{ textAlign: "right", paddingLeft: "10px" }}>{ score }&nbsp;</td>
            <td style={{ textAlign: "left", paddingRight: "10px", fontSize: "75%" }}>({ incr })</td>
          </>;

          round_row.push(entry);
        }
        round_scores.push(<tr> { round_row } </tr>);
      }

      scoreboard_data = <div className="fit-content" style={{ margin: "0 auto 0.5em auto", maxWidth: "90%" }}>
        <c.Card className="fit-content" style={{ padding: "0.5em 0.5em 0.5em 0.5em", maxWidth: "100%" }}>
          <div>
            <h3>Score Board</h3>
            <div style={{ overflow: "auto", maxWidth: "100%" }}>
            <table style={{ fontSize: '1.2em', borderCollapse: "collapse", borderSpacing: 0 }}>
              <thead>
                <tr>
                  <td style={{ paddingLeft: '15px', paddingRight: '15px' }}>Round</td>
                  { score_players }
                </tr>
              </thead>
              <tbody>
                { round_scores }
              </tbody>
              <tfoot>
                <tr>
                  <td>Total</td>
                  { final_scores }
                </tr>
              </tfoot>
            </table>
            </div>
          </div>
        </c.Card>
      </div>;
    }

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
      <div>
        <h1 style={{ color: "#bd2525" }}>Hearts</h1>
        <div>
          {
            this.state.finished && this.state.winner
            ? <h1 style={{ color: "#249724" }}>{ this.state.winner.id === this.props.user.id ? "You" : this.state.winner.display } won!</h1>
            : <h1>Please wait while the game finishes...</h1>
          }
          { scoreboard_data }
          { historical_data }
          <g.Grid fixedColumnWidth={ true }>
            <g.GridCell align="left" span={3} tablet={8} />
            <g.GridCell align="right" span={6} tablet={8}>
              { configuration }
            </g.GridCell>
          </g.Grid>
        </div>
      </div>
    );
  }
}

export {
  HeartsGamePage,
  HeartsAfterPartyPage,
}
