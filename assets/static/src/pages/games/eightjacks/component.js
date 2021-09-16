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
import { CircularProgress } from '@rmwc/circular-progress';
import '@rmwc/circular-progress/styles';
import { Switch } from '@rmwc/switch';
import '@rmwc/switch/styles';
import { Slider } from '@rmwc/slider';
import '@rmwc/slider/styles';

import { CardImage } from '../../../games/card.js';
import { gravatarify } from '../../../utils/gravatar.js';
import { team_colors } from '../team_colors.js';
import { EightJacksGameBoard } from './board.js';

class EightJacksGameComponent extends EightJacksGameBoard {
  constructor(props) {
    super(props);
    this.state.sort_eight_jacks = true;
  }
  render() {
    var status = a => <h3>{ a }</h3>;
    var big_status = a => <h2>{ a }</h2>;
    let annotations = null;
    if (this.state.game.interface.data.who_marked) {
      annotations = [];
      for (let who_player of this.state.game.interface.data.who_marked) {
        let annotation = <><Avatar src={ gravatarify(who_player) } name={ who_player.display } size="medium" /> <span title={ who_player.display }>{ who_player.display }</span></>;
        annotations.push(annotation);
      }
    }
    var indexed_players = {}; var player_status = null;
    if (this.state.game.interface.synopsis.players) {
      player_status = [];
      for (let player of this.state.game.interface.synopsis.players) {
        if (player.player_index !== -1) {
          indexed_players[player.player_index] = player;
        }
      }
      for (let player_index of Object.keys(indexed_players).sort()) {
        let player = indexed_players[player_index];
        let user = player.user;
        player_status.push(
          <div key={ user.id } className={"avatar-progress avatar-progress--"+(user.id === this.props.user.id ? "xlarge" : "large")} style={{ display: "inline-block" }}>
            <Avatar src={ gravatarify(user) } name={ user.display }
              size={ user.id === this.props.user.id ? "xlarge" : "large" } />
            { !player.is_turn ? null :
              <CircularProgress size={ user.id === this.props.user.id ? "xlarge" : "large" } style={{
                "--stroke-color": team_colors[+player.team+1],
              }} />
            }
          </div>
        );
      }
      player_status = <div className="player-status">{ player_status }</div>;
    }

    if (!this.state.game.interface.started) {
      return status("Waiting for game to start …");
    } else if (this.state.game.interface.finished) {
      return <div>
        {status("Finished")}
      </div>;
    }

    return <div>
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
            {this.state.game.interface.my_turn()
              ? <>
                {big_status("Your turn to play")}
                <Button label={ this.state.marking ? "Finish or cancel marking sequence before playing" : (this.state.board_selected ? "Play here" : "Pick a spot!") } unelevated ripple={false} disabled={ !this.state.board_selected || !this.state.selected || this.state.marking || this.state.sorting }
                  onClick={
                    this.clearSelectAnd(
                      () => {
                        this.state.game.interface.play(this.state.selected, this.state.board_selected);
                        this.setState(state => Object.assign({}, state, { board_selected: null, last_remote_selected: null }));
                      }
                    )
                  }
                  />
                <hr/>
                </>
              : <>
                {
                  this.state.game.interface.data?.turn
                  ? status("Waiting for " + this.state.game.interface.data.turn.display  + "…")
                  : status("Waiting for other player(s) …")
                }
                </>
            }
            {this.state.marking ?
              (this.state.marking.length === this.state.game.interface.data.config.run_length
              ? <Button label={ "Mark complete sequence" } raised ripple={false}
                  onClick={this.cancelMarksAnd(() => this.state.game.interface.mark(this.state.marking))} />
              : <Button label={ "Cancel marking" } unelevated ripple={false}
                  onClick={this.cancelMarksAnd()} />)
            : <Button label={ "Mark sequence of " + this.state.game.interface.data.config.run_length } unelevated ripple={false}
                onClick={() => {this.setState(state => Object.assign(state, {marking:[]}))}} />
            }
          </div>
        </c.Card>
      </div>
      <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
        <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
          <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
            <h3>Hand</h3>
            { this.renderHand(true) }
            <br/>
            <Button label={ "Discard dead card" } unelevated ripple={false} disabled={ !this.state.selected || this.state.sorting }
              onClick={this.clearSelectAnd(() => this.state.game.interface.discard(this.state.selected))}/>
            <br/><br/>
            <Switch label={ "Autosort" } checked={this.state.autosort}
              onChange={e => this.setAutosort(e.currentTarget.checked)}/>
            <br/><br/><br/>
            <Switch label={ "Show cards individually" } checked={!this.state.overlap}
              onChange={e => {let overlap=!e.currentTarget.checked;this.setState(state => Object.assign(state, {overlap}))}}/>
          </div>
        </c.Card>
      </div>
      <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
        <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
          <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
            <h3>Rules</h3>
            <div style={{ display: "grid", width: "fit-content", margin: "auto" }}>
              <div style={{ gridColumn: 1, gridRow: 1, textAlign: "right" }}>Play these jacks anywhere,</div>
              <label style={{ gridColumn: 1, gridRow: 2, marginLeft: "auto" }} className="rotate-card">
                <input type="checkbox" className="rotate-card-checkbox"/>
                <div className="rotate-card-inner" style={{ display: "flex", flexDirection: "column" }}>
                  <CardImage suit="diamond" rank="jack" y_part={0.5} scale={0.4}/>
                  <CardImage suit="club" rank="jack" y_part={-0.5} scale={0.4}/>
                </div>
              </label>
              <label style={{ gridColumn: 2, gridRow: 2, margin: "auto" }} className="flip-card">
                <input type="checkbox" className="flip-card-checkbox"/>
                <div className="flip-card-inner">
                  <CardImage suit="black" rank="joker" scale={0.4}/>
                  <CardImage suit="red" rank="joker" scale={0.4}/>
                </div>
              </label>
              <div style={{ gridColumn: 3, gridRow: 1, textAlign: "left" }}>remove markers with these …</div>
              <div style={{ gridColumn: 2, gridRow: 3, textAlign: "center" }}>… and do either with jokers!</div>
              <label style={{ gridColumn: 3, gridRow: 2, marginRight: "auto" }} className="rotate-card">
                <input type="checkbox" className="rotate-card-checkbox"/>
                <div className="rotate-card-inner" style={{ display: "flex", flexDirection: "column" }}>
                  <CardImage suit="heart" rank="jack" y_part={0.5} scale={0.4}/>
                  <CardImage suit="spade" rank="jack" y_part={-0.5} scale={0.4}/>
                </div>
              </label>
            </div>
          </div>
        </c.Card>
      </div>
    </div>;
  }
}

export {
  EightJacksGameComponent,
}
