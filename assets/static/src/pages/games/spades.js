import React from 'react';

import '../../main.scss';

import { gravatarify } from '../../utils/gravatar.js';

import { Avatar } from '@rmwc/avatar';
import '@rmwc/avatar/styles';
import { Button } from '@rmwc/button';
import '@rmwc/card/styles';
import * as c from '@rmwc/card';
import '@rmwc/button/styles';
import { Select } from '@rmwc/select';
import '@rmwc/select/styles';
import { CircularProgress } from '@rmwc/circular-progress';
import '@rmwc/circular-progress/styles';

import { SpadesGame } from '../../games/spades.js';
import { CardSuit, CardImage } from '../../games/card.js';
import { loadGame, addEv, notify, killable } from '../games.js';
import { UserCache } from '../../utils/cache.js';

class SpadesGameComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.state.game = props.game;
    this.state.selected = null;
    this.state.bid_select = new Set();
    this.state.bid = null;
    this.state.bid_suggesting = true;
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
        bid_select: new Set(),
        bid_suggesting: true,
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
  selecting_bid(card) {
    return Object.assign(card, {
      selected: this.state.bid_select.has(card.id),
      onClick: () => {
        this.setState(state => {
          if (state.bid_select.has(card.id))
            state.bid_select.delete(card.id);
          else
            state.bid_select.add(card.id);
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
    // Properties used for display card hands
    var handProps = {
      overlap: true,
      curve: true,
      scale: 0.50,
    };
    if (!this.state.game.interface.started) {
      return status("Waiting for game to start …");
    } else if (this.state.game.interface.finished) {
      return <div>
        {status("Finished")}
      </div>;
    } else if (!this.state.game.interface.dealt) {
      if (this.state.game.interface.my_turn()) {
        if (!this.state.game.interface.data.drawn) {
          return <div>
            <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
              <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
                <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                  <Button label="Draw!" unelevated ripple={false} onClick={() => this.state.game.interface.deal()} />
                </div>
              </c.Card>
            </div>
            <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
              <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
                <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                  <h3>Hand</h3>
                  { this.state.game.interface.data.hand?.toImage(handProps) }
                </div>
              </c.Card>
            </div>
          </div>
        } else {
          return <div>
          <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
            <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
              <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                  {status("You got this card:")}
                  <div style={{ display: "inline-flex", flexDirection: "column", width: "min-content" }}>
                    { this.state.game.interface.data.drawn.toImage() }
                    <Button style={{ flexShrink: 1, flexGrow: 1 }} label="Keep" unelevated ripple={false} onClick={this.captureHandAnd(() => this.state.game.interface.decide(true))} />
                  </div>
                  &nbsp;&nbsp;&nbsp;&nbsp;
                  <div style={{ display: "inline-flex", flexDirection: "column", width: "min-content" }}>
                    <CardImage/>
                    <Button style={{ flexShrink: 1, flexGrow: 1 }} label="Take from deck" unelevated ripple={false} onClick={this.captureHandAnd(() => this.state.game.interface.decide(false))} />
                  </div>
                </div>
              </c.Card>
            </div>
            <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
              <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
                <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                  <h3>Hand</h3>
                  { this.state.game.interface.data.hand?.toImage(handProps) }
                </div>
              </c.Card>
            </div>
          </div>;
        }
      } else {
        return <div>
          <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
            <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
              <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                { status("Waiting for other player to draw …") }
              </div>
            </c.Card>
          </div>
          <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
            <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
              <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                <h3>Hand</h3>
                { this.state.game.interface.data.hand?.toImage(this.showing_new.bind(this), handProps) }
              </div>
            </c.Card>
          </div>
        </div>;
      }
    } else if (!this.state.game.interface.bidded) {
      if (this.state.game.interface.my_turn()) {
        return <div>
          <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
            <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
              <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                {status("Please place your bid:")}
                <Select label="Bid value" enhanced options={ this.state.game.interface.valid_bids() }
                  value={ this.state.bid_suggesting ? ""+this.state.bid_select.size : ""+this.state.bid }
                  onChange={ e => {let bid = +e.currentTarget.value; this.setState(state => Object.assign(state, {bid,bid_suggesting:false}))}
                }/>
                <br />
                <Button label="Place bid" raised ripple={false} onClick={this.clearSelectAnd(() =>
                  this.state.game.interface.bid(this.state.bid_suggesting ? +this.state.bid_select.size : +this.state.bid))
                }/>
                {
                  !this.state.game.interface.data.peeked
                  ? <>&nbsp;&nbsp;<Button label="Peek at cards" raised ripple={false} onClick={() => this.state.game.interface.peek()} /></>
                  : null
                }
              </div>
            </c.Card>
          </div>
          {
            this.state.game.interface.data.peeked
            ? <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
                <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
                  <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                    <h3>Hand</h3>
                    { this.state.game.interface.data.hand?.toImage(this.selecting_bid.bind(this), handProps) }
                  </div>
                </c.Card>
              </div>
            : null
          }
        </div>;
      } else {
        return <div>
          <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
            <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
              <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                {status("Waiting for bids …")}
                <br />
                {
                  !this.state.game.interface.data.peeked
                  ? <Button label="Peek at cards" raised ripple={false} onClick={() => this.state.game.interface.peek()} />
                  : null
                }
              </div>
            </c.Card>
          </div>
          {
            this.state.game.interface.data.peeked
            ? <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
                <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
                  <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                    <h3>Hand</h3>
                    { this.state.game.interface.data.hand?.toImage(this.selecting_bid.bind(this), handProps) }
                  </div>
                </c.Card>
              </div>
            : null
          }
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

class SpadesGameSynopsis extends React.Component {
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
      if (i.bidded && i.dealt && !i.finished) {
        var num_played = this.props.game.interface.data.played.cards.length;
        var num_players = this.props.game.config.num_players;
        if (num_played > 0 && num_played < num_players) {
          new_state.suit = this.props.game.interface.data.played.cards[0].suit;
        } else {
          new_state.suit = "waiting";
        }
      } else if (!i.finished) {
        new_state.suit = i.dealt ? "bidding" : "dealing";
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
      "bid":{
        name: "Bid",
        printer: a => a === 0 ? "–" : a >= 19 ? SpadesGame.bid_names[a] : ""+a,
      },
      "tricks":"Tricks",
      "score":"Score",
      "overtakes":"Overtakes",
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
          <tr key={ "spades_synopsis_headings" }>
            { headings }
          </tr>
          { player_rows }
        </tbody>
      </table>
    }

    return (
      <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
        <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
          <div className="text-left scrollable-x">
            <b>Spades</b>
            { player_view }
          </div>
        </c.Card>
      </div>
    );
  }
}

class SpadesGamePage extends React.Component {
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
            this.props.setPage('afterparty');
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
          this.props.setPage('afterparty');
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
        <SpadesGameSynopsis game={ this.game } {...this.props} />
        <SpadesGameComponent game={ this.game } interface={ this.state.interface } notify={ (...arg) => notify(this.props.snackbar, ...arg) } />
      </div>
    );
  }
}

class SpadesAfterPartyPage extends React.Component {
  constructor(props) {
    super(props);

    this.game = loadGame(this.props.game);
    this.props.setGame(this.game);
  }

  render() {
    return (
      <div>
        <SpadesGameSynopsis game={ this.game } {...this.props} />
      </div>
    );
  }
}

export {
  SpadesGamePage,
  SpadesAfterPartyPage,
}
