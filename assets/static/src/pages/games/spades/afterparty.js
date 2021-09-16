import React from 'react';

import '../../../main.scss';

import { Avatar } from '@rmwc/avatar';
import '@rmwc/avatar/styles';
import { Button } from '@rmwc/button';
import '@rmwc/button/styles';
import { IconButton } from '@rmwc/icon-button';
import '@rmwc/icon-button/styles';
import * as c from '@rmwc/card';
import '@rmwc/card/styles';
import * as l from '@rmwc/list';
import '@rmwc/list/styles';

import { CardHand } from '../../../games/card.js';
import { loadGame, addEv, notify, killable } from '../../games.js';
import { UserCache, GameCache } from '../../../utils/cache.js';
import { gravatarify } from '../../../utils/gravatar.js';

// Properties used for display card hands
var handProps = {
  overlap: true,
  curve: true,
  scale: 0.50,
};

class SpadesAfterPartyComponent extends React.Component {
  constructor(props) {
    super(props);
    this.game = loadGame(this.props.game);
    this.state = {
      game: props.game,
      player_mapping: null,
      history: null,
      historical_round: 0,
      historical_trick: 0,
      historical_player: 0,
      set_historical_player: false,
      active: {
        turn: null,
        leader: null,
        dealer: null,
        played: null,
        who_played: null,
        spades_broken: false,
        played_history: null,
      },
      winners: this.game?.winners,
      dealt: false,
      split: false,
      bidded: false,
      finished: false,
      message: "Loading results...",
      timeout: killable(() => { this.refreshData() }, 5000),
    };

    GameCache.Invalidate(this.props.game.id);

    this.unmount = addEv(this.game, {
      "game-state": async (data) => {
        var mapping = {};
        for (let index in data.player_mapping) {
          mapping[index] = await UserCache.FromId(data.player_mapping[index]);
        }

        let winners = [];

        var history = null;
        if (data.round_history) {
          history = {
            scores: [],
            players: [],
            tricks: [],
          };

          for (let round_index in data.round_history) {
            let round = data.round_history[round_index];
            var round_scores = {};
            var info = {};
            var num_players = round.players.length;
            var max_score = 0;
            for (let player_index in round.players) {
              let player = round.players[player_index];
              round_scores[player_index] = {
                'user': mapping[player_index],
                'bid': player.bid,
                'tricks': player.tricks,
                'round_score': player.round_score,
                'score': player.score,
                'overtakes': player.overtakes,
              };
              info[player_index] = {
                'hand': player?.hand,
                'bid': player.bid,
                'tricks': player.tricks,
              };
              if (num_players === 2) {
                info[player_index].draw_pile = player?.draw_pile;
              }
              if (+round_scores[player_index].score > +max_score) {
                winners = [];
                winners.push(mapping[player_index]);
                max_score = round_scores[player_index].score;
              } else if (+round_scores[player_index].score === +max_score) {
                winners.push(mapping[player_index]);
              }
              let last_hand = player.hand;
              let hand_by_trick = [last_hand];
              for (let trick of round.tricks) {
                last_hand = last_hand.filter(card => !trick.played.some(c => c.id === card.id));
                hand_by_trick.push(last_hand);
              }
              info[player_index].hand_by_trick = player.hand_by_trick || hand_by_trick;
            }

            history.scores.push(round_scores);
            history.players.push(info);

            history.tricks.push(round.tricks);
          }
        }

        let turn = data.turn ? await UserCache.FromId(data.turn) : null;
        let leader = data.leader ? await UserCache.FromId(data.leader) : null;
        let dealer = data.dealer ? await UserCache.FromId(data.dealer) : null;

        let played = null;
        if (data.played) {
          played = CardHand.deserialize(data.played);
        }

        let who_played = this.state.active.who_played;
        if (!who_played || (played && data.who_played && data.played.length === 1 && +who_played[0].id !== +data.who_played[0])) {
          who_played = [];
          if (data.who_played) {
            for (let uid of data.who_played) {
              let player = await UserCache.FromId(uid);
              who_played.push(player);
            }
          }
        }

        // HACK: When refreshData() is called from the button, we don't redraw
        // the screen even though new data is sent. Use snapshots to send only
        // the data we care about.
        this.setState(state => Object.assign({}, state, { history: null }));
        this.setState(state => Object.assign({}, state, {
          player_mapping: mapping,
          history: history,
          winners: winners,
          dealt: data.dealt,
          split: data.split,
          bidded: data.bidded,
          finished: data.finished,
          active: {
            turn: turn,
            leader: leader,
            dealer: dealer,
            played: played,
            who_played: who_played,
            spades_broken: data.spades_broken,
            played_history: data.history ? data.history.map(CardHand.deserialize) : null,
          },
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
  skip(amt) {
    if (amt === 1) {
      this.setState(state => {
        var tricks = state.history.tricks[state.historical_round];
        if (!tricks) return state;
        if (+state.historical_trick === tricks.length-1) {
          if (+state.historical_round === state.history.tricks.length-1) {
            return state;
          } else {
            state.historical_round = +state.historical_round+1;
            state.historical_trick = 0;
          }
        } else {
          state.historical_trick = +state.historical_trick+1;
        }
        return state;
      });
    } else if (amt === 10) {
      this.setState(state => {
        if (+state.historical_round === state.history.tricks.length-1) {
          return state;
        } else {
          state.historical_trick = 0;
          state.historical_round = +state.historical_round+1;
        }
        return state;
      });
    } else if (amt === -1) {
      this.setState(state => {
        var tricks = state.history.tricks[state.historical_round];
        if (!tricks) return state;
        if (+state.historical_trick === 0) {
          if (+state.historical_round === 0) {
            return state;
          } else {
            state.historical_round = +state.historical_round-1;
            state.historical_trick = state.history.tricks[state.historical_round].length-1;
          }
        } else {
          state.historical_trick = +state.historical_trick-1;
        }
        return state;
      });
    } else if (amt === -10) {
      this.setState(state => {
        var tricks = state.history.tricks[state.historical_round];
        if (!tricks) return state;
        if (+state.historical_trick === 0) {
          if (+state.historical_round === 0) {
            return state;
          } else {
            state.historical_round = +state.historical_round-1;
            state.historical_trick = 0;
          }
        } else {
          state.historical_trick = 0;
        }
        return state;
      });
    } else if (amt === 5) {
      this.setState(state => {
        var len = Object.assign([], state.player_mapping).length;
        state.historical_player = (+state.historical_player+1) % len;
        return state;
      });
    } else if (amt === -5) {
      this.setState(state => {
        var len = Object.assign([], state.player_mapping).length;
        state.historical_player = +state.historical_player-1;
        if (state.historical_player < 0)
          state.historical_player = len-1;
        return state;
      });
    } else throw new Error("Unknown amount: ", amt);
  }

  render() {
    var current_round = null;

    if (this.state.active.played) {
      var annotations = [];
      for (let who_player of this.state.active.who_played) {
        let annotation = <div key={ who_player.id }><Avatar src={ gravatarify(who_player) } name={ who_player.display } size="medium" /> <span title={ who_player.display }>{ who_player.display }</span></div>;
        annotations.push(annotation);
      }

      current_round = <div>
        <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
          <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
            <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
              { this.state.active.played?.toImage(null, null, annotations) }
            </div>
          </c.Card>
        </div>
      </div>;
    } else if (!this.state.finished) {
      current_round = <div>
        <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
          <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
            <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
              {
                !this.state.dealt
                ? "Please wait for the round to begin..."
                : !this.state.split
                ? "Please wait for the cards to be split..."
                : !this.state.bidded
                ? "Please wait for players to bid..."
                : "Please wait for a card to be played..."
              }
            </div>
          </c.Card>
        </div>
      </div>;
    }

    var historical_data = null;
    var scoreboard_data = null;

    if (this.state.history && this.state.history.tricks.length > 0) {
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
          let hand = player?.hand ? CardHand.deserialize(player.hand).cardSort(true, true) : null;
          hands_data.push(
            <div key={ user.id }>
              <l.List>
                <l.CollapsibleList handle={
                    <l.SimpleListItem text={ <b>{user.display + "'s"} Hand</b> } metaIcon="chevron_right" />
                  }
                >
                  <div style={{ paddingTop: '15px', paddingBottom: '15px' }}>
                    { hand ? hand.toImage(handProps) : null }
                  </div>
                </l.CollapsibleList>
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
                let annotation = <div key={ annotation_player.id }><Avatar src={ gravatarify(annotation_player) } name={ annotation_player.display } size="medium" /> <span title={ annotation_player.display }>{ annotation_player.display }</span></div>;
                if (annotation_player_index === trick.winner) {
                  annotation = <div key={ annotation_player.id }><Avatar src={ gravatarify(annotation_player) } name={ annotation_player.display } size="medium" /> <b title={ annotation_player.display }>{ annotation_player.display }</b></div>;
                }
                annotations.push(annotation);
              }
            }
            let cards = trick?.played ? CardHand.deserialize(trick.played).toImage(null, null, annotations) : null;
            tricks_data.push(
              <l.CollapsibleList key={ trick_index } handle={
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

      let thistory = null;
      if (this.state.historical_trick === -1) {
        let players = this.state.history.players[this.state.historical_round];
        let player = players && players[this.state.historical_player];
        if (!player) {
          thistory = <b>No data for this player.</b>;
        } else {
          let show_dealt = this.state.show_dealt;
          let played_hand = player.played_hand ? CardHand.deserialize(player.played_hand).cardSort(true, true) : null;
          let dealt_hand = player.dealt_hand ? CardHand.deserialize(player.dealt_hand).cardSort(true, true) : null;
          let passed = player.passed ? CardHand.deserialize(player.passed).cardSort(true, true) : null;
          let got_passed = player.got_passed ? CardHand.deserialize(player.got_passed).cardSort(true, true) : null;
          let was_passed = !(show_dealt ? passed : got_passed) ? _ => false :
                card => (show_dealt ? passed : got_passed).cards.findIndex(c => c.id === card.id) >= 0;
          thistory = <>
            { !(show_dealt ? got_passed : passed)
              ? <></> :
              <>
                <h2>{ show_dealt ? "Received" : "Passed" }</h2>
                { (show_dealt ? got_passed : passed)?.toImage(handProps) }
              </>
            }
            <h2>{ show_dealt ? (passed ? "Passing" : "Hand") : (got_passed ? "Receiving" : "Hand") }</h2>
            { (show_dealt ? dealt_hand : (played_hand || dealt_hand))?.toImage(card => {
                card.selected = was_passed(card);
                return card;
              }, handProps)
            }
          </>;
        }
      } else {
        let tricks = this.state.history.tricks[this.state.historical_round];
        let trick = tricks && tricks[this.state.historical_trick];
        if (!trick) {
          thistory = <b>No data for this trick.</b>;
        } else {
          let num_players = Object.keys(this.state.player_mapping).length;
          let played = trick.played ? CardHand.deserialize(trick.played) : null;
          let annotations = [];
          for (let offset = 0; offset < num_players; offset++) {
            let annotation_player_index = (trick.leader + offset) % num_players;
            let annotation_player = this.state.player_mapping[annotation_player_index];
            let annotation = <span key={ annotation_player.id }><Avatar src={ gravatarify(annotation_player) } name={ annotation_player.display } size="medium" /> { annotation_player.display }</span>;
            if (annotation_player_index === trick.winner) {
              annotation = <span key={ annotation_player.id }><Avatar src={ gravatarify(annotation_player) } name={ annotation_player.display } size="medium" /> <b>{ annotation_player.display }</b></span>;
            }
            annotations.push(annotation);
          }
          let players = this.state.history.players[this.state.historical_round];
          let player = players && players[this.state.historical_player];
          let player_trick = player && player.hand_by_trick[this.state.historical_trick];
          let thand = null;
          if (!player_trick) {
            thand = <b>No data for this player/trick.</b>;
          } else {
            let playing = card => {
              card.selected = played.cards.findIndex(c => c.id === card.id) >= 0;
              return card;
            };
            thand = CardHand.deserialize(player_trick).cardSort(true, true).toImage(playing, handProps);
          }
          let cards = played?.toImage(null, null, annotations);
          thistory = <>
            <h2>Trick</h2>
            { cards }
            <h2>Hand</h2>
            { thand }
          </>;
        }
      }

      historical_data = <div style={{ width: "90%" , margin: "0 auto 0.5em auto" }}>
        <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
          <div>
            <h3>Game Analysis</h3>
            <div style={{ margin: "auto" }}>
              <IconButton icon="skip_previous" size="xsmall" onClick={ () => this.skip(-10) }/>
              <IconButton icon="fast_rewind" size="xsmall" onClick={ () => this.skip(-1) }/>
              <div style={{ display: "inline-flex", flexDirection: "column", verticalAlign: "text-bottom" }}>
                <h2 style={{ margin: 0 }}>Round {+this.state.historical_round+1}</h2>
                <h3 style={{ margin: 0 }}>{ +this.state.historical_trick === -1 ? "Cards" : "Trick "+(+this.state.historical_trick+1) }</h3>
              </div>
              <IconButton icon="fast_forward" size="xsmall" onClick={ () => this.skip(1) }/>
              <IconButton icon="skip_next" size="xsmall" onClick={ () => this.skip(10) }/>
            </div>
            <div>
              { thistory }
            </div>
            <div style={{ margin: "auto" }}>
              <IconButton icon="rotate_left" size="xsmall" onClick={ () => this.skip(-5) }/>
              <div style={{ display: "inline-flex", flexDirection: "column", verticalAlign: "super" }}>
                <h2 style={{ margin: 0 }}>{this.state.player_mapping[this.state.historical_player].display}</h2>
              </div>
              <IconButton icon="rotate_right" size="xsmall" onClick={ () => this.skip(5) }/>
            </div>
          </div>
        </c.Card>
      </div>;

      var score_players = [];
      var round_scores = [];
      var final_scores = [];
      for (let player_index of Object.keys(this.state.player_mapping).sort()) {
        let score_player = this.state.player_mapping[player_index];
        score_players.push(<td key={ player_index } colSpan={2} style={{ borderBottom: "1px solid #777", paddingLeft: '25px', paddingRight: '25px' }}><Avatar src={ gravatarify(score_player) } name={ score_player.display } size="medium" /> { score_player.display }</td>);
      }
      for (let round_index in this.state.history.scores) {
        let round_row = [];
        round_row.push(<td key={ round_index } style={{ borderTop: "10px solid transparent", borderBottom: "10px solid transparent" }}> { parseInt(round_index) + 1 } </td>);
        for (let player_index of Object.keys(this.state.player_mapping).sort()) {
          let round_score = parseInt(this.state.history.scores[round_index][player_index].round_score);
          let score = parseInt(this.state.history.scores[round_index][player_index].score);
          let overtakes = parseInt(this.state.history.scores[round_index][player_index].overtakes);

          if (parseInt(round_index) === (this.state.history.scores.length - 1)) {
            final_scores.push(<td key={ player_index } colSpan={2} style={{ whiteSpace: "nowrap", borderTop: "1px solid #000" }}> { score } / { overtakes } </td>);
          }

          let entry = '-';
          let incr = !isNaN(round_score) && round_score < 0 ? ""+round_score : "+"+round_score
          entry = [
            <td key={ player_index+"score" } style={{ whiteSpace: "nowrap", textAlign: "right", paddingLeft: "10px" }}>{ score } / { overtakes }&nbsp;</td>,
            <td key={ player_index+"incr" } style={{ textAlign: "left", paddingRight: "10px", fontSize: "75%" }}>({ incr })</td>,
          ];

          round_row.push(...entry);
        }
        round_scores.push(<tr key={ round_index }>{ round_row }</tr>);
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

    var winner_info = <h1>Please wait while the game finishes...</h1>;
    if (this.state.finished && this.state.winners) {
      var winner_names = this.state.winners[0].display;
      if (this.state.winners.length === 1) {
        if (+this.state.winners[0].id === +this.props.user.id) {
          winner_names = "You"
        }
      } else {
        let all_names = [];
        for (let winner of this.state.winners) {
          if (+winner.id === +this.props.user.id) {
            all_names.push("You");
          } else {
            all_names.push(winner.display);
          }
        }

        winner_names = "";
        for (let name_index in all_names) {
          let name = all_names[name_index];
          if (+name_index === 0) {
            winner_names = name;
            continue;
          }

          if (+name_index < all_names.length - 1) {
            winner_names += ", " + name;
            continue;
          }

          if (+name_index === 1) {
            winner_names += " and " + name;
          } else {
            winner_names += ", and " + name;
          }
        }
      }

      winner_info = <h1 style={{ color: "#249724" }}>{winner_names} won!</h1>
    }

    return (
      <div>
        <h1 style={{ color: "#000000" }}>Spades</h1>
        <div>
          { winner_info }
          {
            this.props.room ? <><Button onClick={ () => this.returnToRoom() } raised >Return to Room</Button><br /><br /></> : <></>
          }
          { current_round }
          { scoreboard_data }
          { historical_data }
        </div>
      </div>
    );
  }
}

export {
  SpadesAfterPartyComponent
};
