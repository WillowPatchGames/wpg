import React from 'react';

import '../../../main.scss';

import { Button } from '@rmwc/button';
import '@rmwc/button/styles';
import { IconButton } from '@rmwc/icon-button';
import '@rmwc/icon-button/styles';
import * as c from '@rmwc/card';
import '@rmwc/card/styles';
import * as g from '@rmwc/grid';
import '@rmwc/grid/styles';
import { Switch } from '@rmwc/switch';
import '@rmwc/switch/styles';
import { Slider } from '@rmwc/slider';
import '@rmwc/slider/styles';

import { CardImage } from '../../../games/card.js';
import { EightJacksGameBoard } from './board.js';

class EightJacksGameComponent extends EightJacksGameBoard {
  constructor(props) {
    super(props);
    this.state.sort_eight_jacks = true;
    this.state.layout = 'standard';
  }
  setLayout(layout) {
    this.setState(state => Object.assign({}, state, { layout }));
  }
  renderStandardLayout(board, play_button, marking_button, discard_button, autosort_switch, overlap_switch, layout, rules) {
    var status = a => <h3>{ a }</h3>;
    var big_status = a => <h2>{ a }</h2>;

    return (
      <div>
        <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
          <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
            <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
              { board }
              {
                this.state.game.interface.my_turn()
                ? <>
                  {big_status("Your turn to play")}
                  { play_button }
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
              { marking_button }
            </div>
          </c.Card>
        </div>
        <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
          <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
            <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
              <h3>Hand</h3>
              { this.renderHand(true) }
              <br/>
              { discard_button }
              <br/><br/>
              { autosort_switch }
              <br/><br/><br/>
              { overlap_switch }
            </div>
          </c.Card>
        </div>
        <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
          <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
            <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
              { layout }
            </div>
          </c.Card>
        </div>
        <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
          <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
            <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
              { rules }
            </div>
          </c.Card>
        </div>
      </div>
    );
  }
  renderHandLayout(board, play_button, marking_button, discard_button, autosort_switch, overlap_switch, layout, rules) {
    var status = a => <h3>{ a }</h3>;

    let turn = status("Your turn to play");
    if (!this.state.game.interface.my_turn()) {
      turn = status("Waiting for other player(s) …");
      if (this.state.game.interface.data?.turn) {
        turn = status("Waiting for " + this.state.game.interface.data.turn.display  + "…");
      }
    }

    let left = <g.GridCell align="middle" phone={4} tablet={3} desktop={3} style={{ 'textAlign': 'center', 'justifyContent': 'center' }}>
      { turn }
      <br /><br />
      { play_button }
      <br/><br/>
      { discard_button }
    </g.GridCell>;

    let right = <g.GridCell align="middle" phone={4} tablet={5} desktop={9}>
      <h3>Hand</h3>
      { this.renderHand(true) }
      <br/><br/>
      { autosort_switch }
      <span class="leftpad">
        { overlap_switch }
      </span>
    </g.GridCell>;

    if (this.state.layout === 'hand-left') {
      let tmp = right;
      right = left;
      left = tmp;
    }

    return (
      <div>
        <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
          <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
            <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
              { board }
              <hr />
              { marking_button }
            </div>
          </c.Card>
        </div>
        <div style={{ width: "98%" , margin: "0 auto 1em auto" }}>
          <c.Card style={{ width: "100%" , padding: "0.2em 0.2em 0.2em 0.2em" }}>
            <g.Grid fixedColumnWidth={ true }>
              { left }
              { right }
            </g.Grid>
          </c.Card>
        </div>
        <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
          <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
            <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
              { layout }
            </div>
          </c.Card>
        </div>
        <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
          <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
            <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
              { rules }
            </div>
          </c.Card>
        </div>
      </div>
    );
  }
  render() {
    var status = a => <h3>{ a }</h3>;

    // We have three states:
    // 1. Waiting for the game to start (should largely be temporary...)
    // 2. The game has finished (should largely be temporary -> redirect to after party)
    // 3. Playing the game --> depends on layout

    if (!this.state.game.interface.started) {
      return status("Waiting for game to start …");
    }

    if (this.state.game.interface.finished) {
      return <div>
        {status("Finished")}
      </div>;
    }

    let board = <>
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
    </>;

    let play_button = <Button label={ this.state.marking ? "Finish marking" : (this.state.board_selected ? "Play here" : "Pick a spot!") } unelevated ripple={false} disabled={ !this.state.board_selected || !this.state.selected || this.state.marking || this.state.sorting }
      onClick={
        this.clearSelectAnd(
          () => {
            this.state.game.interface.play(this.state.selected, this.state.board_selected);
            this.setState(state => Object.assign({}, state, { board_selected: null, last_remote_selected: null }));
          }
        )
      }
    />;

    let marking_button = <Button
      label={ "Mark sequence of " + this.state.game.interface.data.config.run_length } unelevated ripple={false}
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

    let discard_button = <Button
      label={ "Discard dead card" } unelevated ripple={false} disabled={ !this.state.selected || this.state.sorting }
      onClick={this.clearSelectAnd(() => this.state.game.interface.discard(this.state.selected))}
    />;

    let autosort_switch = <Switch
      label={ "Autosort" } checked={this.state.autosort}
      onChange={e => this.setAutosort(e.currentTarget.checked)}
    />;

    let overlap_switch = <Switch
      label={ "Show cards individually" } checked={!this.state.overlap}
      onChange={e => {let overlap=!e.currentTarget.checked;this.setState(state => Object.assign(state, {overlap}))}}
    />;

    let rules = <>
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
    </>;

  let layout = <>
    <h3>Layout</h3>
    <Button label="Standard" onClick={ () => this.setLayout('standard') } raised />
    <br />
    <br />
    <Button label="Buttons Right of Hand" onClick={ () => this.setLayout('hand-left') } raised />
    <br />
    <br />
    <Button label="Buttons Left of Hand" onClick={ () => this.setLayout('hand-right') } raised />
  </>;

    if (this.state.layout === 'hand-left' || this.state.layout === 'hand-right') {
      return this.renderHandLayout(board, play_button, marking_button, discard_button, autosort_switch, overlap_switch, layout, rules);
    }

    return this.renderStandardLayout(board, play_button, marking_button, discard_button, autosort_switch, overlap_switch, layout, rules);
  }
}

export {
  EightJacksGameComponent,
}
