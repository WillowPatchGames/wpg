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
import { Select } from '@rmwc/select';
import '@rmwc/select/styles';
import { Slider } from '@rmwc/slider';
import '@rmwc/slider/styles';

import { CardRank, CardHand } from '../../../games/card.js';
import { loadGame, addEv, notify, killable } from '../../games.js';
import { UserCache, GameCache } from '../../../utils/cache.js';
import { gravatarify } from '../../../utils/gravatar.js';

import { EightJacksGameBoard } from './board.js';
import { EightJacksGameComponent } from './component.js';

// Properties used for displaying card hands
var handProps = {
  scale: 0.50,
  overlap: true,
  curve: true,
};

class EightJacksAfterPartyComponent extends EightJacksGameBoard {
  constructor(props) {
    super(props);
    this.game = this.state.game;
    this.state.player_mapping = null;
    this.state.history = null;
    this.state.historical_round = "0";
    this.state.active = {
      turn: null,
      dealer: null,
    };
    this.state.winners = this.game?.winners;
    this.state.dealt = false;
    this.state.finished = false;
    this.state.message = "Loading results...";
    this.state.timeout = killable(() => { this.refreshData() }, 5000);

    GameCache.Invalidate(this.props.game.id);

    let personalize = async (usr) => usr === this.props.user.id ? "You" : (await UserCache.FromId(usr)).display;
    this.unmount = addEv(this.game, {
      "game-state": async (data) => {
        let winners = [];
        if (data.winners) {
          winners = await Promise.all(data.winners.map(UserCache.FromId.bind(UserCache)));
        }
        if (!winners.length) winners = null;
        this.game.winners = winners;

        let active = {
          turn: null,
          dealer: null,
        };
        let board_selected = this.state.board_selected;
        if (!data.finished) {
          active.turn = await UserCache.FromId(data.turn);
          if (active?.turn !== this.state.active?.turn) {
            board_selected = null;
          }
          active.dealer = await UserCache.FromId(data.dealer);
        }

        // Note: this also tells the rendering to update for the
        // interface state updates.
        this.setState(state => Object.assign(state, { winners, active, board_selected }));
        if (data.finished) {
          if (this.state.timeout) {
            this.state.timeout.kill();
          }

          this.setState(state => Object.assign({}, state, { finished: true, timeout: null }));
        }
      },
      "draw": async (data) => {
        data.message = await personalize(data.drawer) + " drew!";
        notify(this.props.snackbar, data.message, data.type);
      },
      "finished": async (data) => {
        data.message = await Promise.all(data.winners.map(personalize)) + " won!";
        notify(this.props.snackbar, data.message, data.type);
        this.game.winners = data.winners;
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
  returnToRoom() {
    if (this.props.game.interface) {
      this.props.game.interface.close();
    }
    this.props.game.interface = null;

    this.props.setGame(null);
    this.props.setPage("room", true);
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
          let hand = player?.hand ? CardHand.deserialize(player.hand).cardSort(true, false, true) : null;
          hands_data.push(
            <div>
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
                let annotation = <><Avatar src={ gravatarify(annotation_player) } name={ annotation_player.display } size="medium" /> <span title={ annotation_player.display }>{ annotation_player.display }</span></>;
                if (annotation_player_index === trick.winner) {
                  annotation = <><Avatar src={ gravatarify(annotation_player) } name={ annotation_player.display } size="medium" /> <b title={ annotation_player.display }>{ annotation_player.display }</b></>;
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
          let overtakes = parseInt(this.state.history.scores[round_index][player_index].overtakes);

          if (parseInt(round_index) === (this.state.history.scores.length - 1)) {
            final_scores.push(<td colspan={2} style={{ whiteSpace: "nowrap", borderTop: "1px solid #000" }}> { score } / { overtakes } </td>);
          }

          let entry = '-';
          let incr = !isNaN(round_score) && round_score < 0 ? ""+round_score : "+"+round_score
          entry = <>
            <td style={{ whiteSpace: "nowrap", textAlign: "right", paddingLeft: "10px" }}>{ score } / { overtakes }&nbsp;</td>
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
    } else if (!this.state.finished && this.state.active?.turn) {
      winner_info = <h1>{ this.state.active.turn.display + "'s" } turn!</h1>
    }

    let marking_button = <Button
      label={ "Mark sequence of " + this.state.game.interface.data.config?.run_length } unelevated ripple={false}
      onClick={() => {this.setState(state => Object.assign(state, {marking:[]}))}}
    />;
    if (this.state.marking) {
      marking_button = <Button
        label={ "Cancel marking" } unelevated ripple={false}
        onClick={this.cancelMarksAnd()}
      />;
      if (this.state.marking.length === this.state.game.interface.data.config.run_length) {
        marking_button = <Button
          label={ "Mark complete sequence" } raised ripple={false}
          onClick={this.cancelMarksAnd(() => this.state.game.interface.mark(this.state.marking))}
        />;
      }
    }

    return (
      <div>
        <h1 style={{ color: "#000000" }}><span style={{ color: "#bd2525" }}>Eight</span> Jacks</h1>
        <div>
          { winner_info }
          {
            this.props.room ? <><Button onClick={ () => this.returnToRoom() } raised >Return to Room</Button><br /><br /></> : <></>
          }
          { scoreboard_data }
          <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
            <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
              <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                <h3>Board</h3>
                <div style={{ display: "flex" }}>
                  <IconButton
                    checked={this.state.half_height}
                    onClick={() => this.setState(state => Object.assign(state, {half_height:!state.half_height}))}
                    onIcon="unfold_more"
                    icon="unfold_less"
                  />
                  <Slider
                      value={this.state.scale}
                      onInput={e => {let scale = e.detail.value; this.setState(state => Object.assign(state, {scale}))}}
                      min={0.1}
                      max={0.45}
                    />
                  <IconButton
                    onClick={() => this.setState(state => Object.assign(state, {orientation:(state.orientation + 1) % 4}))}
                    icon="rotate_90_degrees_ccw"
                  />
                </div>
                { this.drawBoard(true) }
                { marking_button }
              </div>
            </c.Card>
          </div>
          { historical_data }
        </div>
      </div>
    );
  }
}


export {
  EightJacksAfterPartyComponent,
}
