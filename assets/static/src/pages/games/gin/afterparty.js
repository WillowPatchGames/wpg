import React from 'react';

import '../../../main.scss';

import { Avatar } from '@rmwc/avatar';
import '@rmwc/avatar/styles';
import { Button } from '@rmwc/button';
import '@rmwc/card/styles';
import * as c from '@rmwc/card';
import '@rmwc/button/styles';
import * as g from '@rmwc/grid';
import '@rmwc/grid/styles';
import { IconButton } from '@rmwc/icon-button';
import '@rmwc/icon-button/styles';
import * as l from '@rmwc/list';
import '@rmwc/list/styles';
import { Switch } from '@rmwc/switch';
import '@rmwc/switch/styles';

import { loadGame, addEv, notify, killable, CreateGameForm } from '../../games.js';
import { UserCache, GameCache } from '../../../utils/cache.js';
import { Card, CardHand, CardImage } from '../../../games/card.js';
import { gravatarify } from '../../../utils/gravatar.js';

import { GinGameSynopsis } from './synopsis.js';

// Properties used for displaying card hands
var handProps = {
  scale: 0.50,
  overlap: true,
  curve: true,
};

var discardProps = {
  overlap: true,
};

class GinAfterPartyPage extends React.Component {
  constructor(props) {
    super(props);

    this.game = loadGame(this.props.game);
    this.props.setGame(this.game);

    this.state = {
      player_mapping: null,
      history: null,
      historical_round: 0,
      historical_turn: -1,
      historical_player: 0,
      set_historical_player: false,
      show_dealt: true,
      show_before: true,
      active: {
        turn: null,
        played: null,
        laid_down: null,
        disard: null,
      },
      winner: this.game.winner,
      dealt: false,
      laid_down: false,
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
        var myplayerindex = 0;
        for (let index in data.player_mapping) {
          mapping[index] = await UserCache.FromId(data.player_mapping[index]);
          if (!this.state.set_historical_player) {
            if (mapping[index].id === this.props.user.id) {
              myplayerindex = index;
            }
          }
        }

        var history = null;
        if (data.round_history) {
          history = {
            scores: [],
            players: [],
            turns: [],
          };

          for (let round of data.round_history) {
            var round_scores = {};
            var info = {};
            var turns = round?.plays;

            for (let player_index in round.players) {
              let player = round.players[player_index];
              round_scores[player_index] = {
                'user': mapping[player_index],
                'round_score': player.round_score,
                'score': player.score,
              };
              info[player_index] = {
                'dealt_hand': player?.dealt_hand,
                'final_hand': player?.final_hand,
              };
            }

            history.scores.push(round_scores);
            history.players.push(info);
            history.turns.push(turns);
          }
        }

        let turn = data.turn ? await UserCache.FromId(data.turn) : null;
        let dealer = data.dealer ? await UserCache.FromId(data.dealer) : null;
        let laid_down = data.laid_down_id ? await UserCache.FromId(data.laid_down_id) : null;

        // HACK: When refreshData() is called from the button, we don't redraw
        // the screen even though new data is sent. Use snapshots to send only
        // the data we care about.
        this.setState(state => Object.assign({}, state, { history: null }));
        this.setState(state => Object.assign({}, state, {
          player_mapping: mapping,
          history: history,
          winner: winner,
          dealt: data.dealt,
          laid_down: data.laid_down,
          finished: data.finished,
          historical_player: !this.state.set_historical_player ? myplayerindex : this.state.historical_player,
          set_historical_player: true,
          active: {
            turn: turn,
            dealer: dealer,
            laid_down: laid_down,
            discard: data.discard ? CardHand.deserialize(data.discard) : null,
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
    if (this.props.game?.interface) {
      this.props.game.interface.close();
    }

    this.props.game.interface = null;

    this.props.setGame(null);
    this.props.setPage("room", true);
  }
  skip(amt) {
    console.log(amt, this.state);
    if (amt === 1) {
      this.setState(state => {
        var turn = state.history.turns[state.historical_round];
        if (!turn) return state;
        if (+state.historical_turn === turn.length-1) {
          if (+state.historical_round === state.history.turns.length-1) {
            return state;
          } else {
            state.historical_round = +state.historical_round+1;
            state.historical_turn = -1;
          }
        } else {
          state.historical_turn = +state.historical_turn+1;
        }
        return state;
      });
    } else if (amt === 10) {
      this.setState(state => {
        if (+state.historical_round === state.history.turns.length-1) {
          return state;
        } else {
          state.historical_turn = -1;
          state.historical_round = +state.historical_round+1;
        }
        return state;
      });
    } else if (amt === -1) {
      this.setState(state => {
        var turn = state.history.turns[state.historical_round];
        if (!turn) return state;
        if (+state.historical_turn === -1) {
          if (+state.historical_round === 0) {
            return state;
          } else {
            state.historical_round = +state.historical_round-1;
            state.historical_turn = state.history.turns[state.historical_round].length-1;
          }
        } else {
          state.historical_turn = +state.historical_turn-1;
        }
        return state;
      });
    } else if (amt === -10) {
      this.setState(state => {
        console.log("Before state:", state);
        var turn = state.history.turns[state.historical_round];
        if (!turn) return state;
        if (+state.historical_turn === -1) {
          if (+state.historical_round === 0) {
            console.log("After state no change:", state);
            return state;
          } else {
            state.historical_round = +state.historical_round-1;
            state.historical_turn = -1;
          }
        } else {
          state.historical_turn = -1;
        }
        console.log("After state:", state);
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
    let current_round = null;
    let historical_data = null;
    let scoreboard_data = null;

    if (!this.state.finished) {
      if (this.state.dealt && !this.state.laid_down) {
        current_round = <div>
          <h2>{ this.state.active.turn.display + "'s" } turn...</h2>
          <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
            <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
              <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                { this.state.active.discard?.toImage(discardProps) }
              </div>
            </c.Card>
          </div>
        </div>;
      } else if (this.state.laid_down) {
        current_round = <div>
          <h2>{ this.state.active.laid_down.display } laid down!</h2>
          <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
            <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
              <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                { this.state.active.discard?.toImage(discardProps) }
              </div>
            </c.Card>
          </div>
        </div>;
      } else {
        current_round = <div>
          <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
            <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
              <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                Please wait for the round to begin...
              </div>
            </c.Card>
          </div>
        </div>;
      }
    }

    if (this.state.history && this.state.history.scores) {
      let round_index = parseInt(this.state.historical_round);
      let thistory = <b>No data found for round { round_index + 1 }!</b>;

      if (this.state.history.players[round_index]) {
        if (this.state.historical_turn === -1) {
          let players = this.state.history.players[this.state.historical_round];
          let player = players && players[this.state.historical_player];
          if (!player) {
            thistory = <b>No data for this player.</b>;
          } else {
            let show_dealt = this.state.show_dealt;
            let final_hand = player.final_hand ? CardHand.deserialize(player.final_hand).cardSort(false, false) : null;
            let dealt_hand = player.dealt_hand ? CardHand.deserialize(player.dealt_hand).cardSort(false, false) : null;
            thistory = <>
              <h2>{ show_dealt ? "Intial Hand" : "Final Hand" }</h2>
              { (show_dealt ? dealt_hand : final_hand)?.toImage(handProps) }
            </>;
          }
        } else {
          let turns = this.state.history.turns[this.state.historical_round];
          let turn = turns && turns[this.state.historical_turn];
          if (!turn) {
            thistory = <b>No data for this turn.</b>;
          } else {
            let show_before = this.state.show_before;
            let top_discard = turn.top_discard ? Card.deserialize(turn.top_discard) : null;
            let drawn = turn.drawn ? Card.deserialize(turn.drawn) : null;
            let discarded = turn.discarded ? Card.deserialize(turn.discarded) : null;
            let starting_hand = turn.starting_hand ? CardHand.deserialize(turn.starting_hand).cardSort(false, false) : null;
            let ending_hand = turn.ending_hand ? CardHand.deserialize(turn.ending_hand).cardSort(false, false) : null;
            let player = this.state.player_mapping[turn.player];
            let laid_down = turn.laid_down;
            thistory = <>
              { laid_down ? <h2>Went Out!</h2> : null }
              <div className="flexbox">
                <div className="flexible">
                  <h3>Deck</h3>
                  <CardImage />
                </div>
                <div className="flexible">
                  <h3>Discard Pile</h3>
                  { top_discard.toImage() }
                </div>
                {
                  show_before
                  ? <div className="flexible">
                      <h3>Drawn</h3>
                      { drawn.toImage() }
                    </div>
                  : <div className="flexible">
                      <h3>Discarded</h3>
                      { discarded.toImage() }
                    </div>
                }
              </div>
              <h2>{ show_before ? "Before Discarding" : "After Discarding" }</h2>
              { (show_before ? starting_hand : ending_hand)?.toImage(handProps) }
              <h2>{ player.display }</h2>
            </>;
          }
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
                <h3 style={{ margin: 0 }}>{ +this.state.historical_turn === -1 ? "Hands" : "Turn "+(+this.state.historical_turn+1) }</h3>
              </div>
              <IconButton icon="fast_forward" size="xsmall" onClick={ () => this.skip(1) }/>
              <IconButton icon="skip_next" size="xsmall" onClick={ () => this.skip(10) }/>
            </div>
            <div>
              { thistory }
            </div>
            {
              this.state.historical_turn !== -1
              ? <>
                  <Switch
                    label={ !this.state.show_before ? "Show Hand After Discarding" : "Show Hand Before Discarding" }
                    name="show_before"
                    checked={ !this.state.show_before }
                    onChange={ () => this.setState(Object.assign({}, this.state, { show_before: !this.state.show_before })) }
                  />
                </>
              : <>
                  <Switch
                    label={ !this.state.show_dealt ? "Show Final Hand" : "Show Dealt Hand" }
                    name="show_dealt"
                    checked={ !this.state.show_dealt }
                    onChange={ () => this.setState(Object.assign({}, this.state, { show_dealt: !this.state.show_dealt })) }
                  />
                  <div style={{ margin: "auto" }}>
                    <IconButton icon="rotate_left" size="xsmall" onClick={ () => this.skip(-5) }/>
                    <div style={{ display: "inline-flex", flexDirection: "column", verticalAlign: "super" }}>
                      <h2 style={{ margin: 0 }}>{this.state.player_mapping[this.state.historical_player].display}</h2>
                    </div>
                    <IconButton icon="rotate_right" size="xsmall" onClick={ () => this.skip(5) }/>
                  </div>
                </>
            }
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

          if (parseInt(round_index) === (this.state.history.scores.length - 1)) {
            if (+this.state.player_mapping[player_index].id === +this.state.winner.id) {
              final_scores.push(<td key={ player_index } colSpan={2} style={{ borderTop: "1px solid #000" }}> <b> { score } </b> </td>);
            } else {
              final_scores.push(<td key={ player_index } colSpan={2} style={{ borderTop: "1px solid #000" }}> { score } </td>);
            }
          }

          let incr = !isNaN(round_score) && round_score;
          let entries = [
            <td key={ player_index+"_score" } style={{ textAlign: "right", paddingLeft: "10px" }}>{ score }&nbsp;</td>,
            <td key={ player_index+"_incr" } style={{ textAlign: "left", paddingRight: "10px", fontSize: "75%" }}>({ incr })</td>
          ];

          round_row.push(...entries);
        }
        round_scores.push(<tr key={ round_index }>{ round_row }</tr>);
      }

      scoreboard_data = <div className="fit-content" style={{ margin: "0 auto 2em auto", maxWidth: "90%" }}>
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
        {
          !this.state.finished
          ? <GinGameSynopsis game={ this.game } {...this.props} />
          : null
        }
        <h1 style={{ color: "#bd2525" }}>Gin</h1>
        <div>
          {
            this.state.finished && this.state.winner
            ? <h1 style={{ color: "#249724" }}>{ this.state.winner.id === this.props.user.id ? "You" : this.state.winner.display } won!</h1>
            : <h1>Please wait while the game finishes...</h1>
          }
          {
            this.props.room ? <><Button onClick={ () => this.returnToRoom() } raised >Return to Room</Button><br /><br /></> : <></>
          }
          { current_round }
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
  GinAfterPartyPage
};
