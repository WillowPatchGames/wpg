import React from 'react';

import '../../../main.scss';

import { Button } from '@rmwc/button';
import '@rmwc/card/styles';
import * as c from '@rmwc/card';
import '@rmwc/button/styles';
import * as d from '@rmwc/dialog';
import '@rmwc/dialog/styles';
import * as l from '@rmwc/list';
import '@rmwc/list/styles';
import { Switch } from '@rmwc/switch';
import '@rmwc/switch/styles';
import { Theme } from '@rmwc/theme';
import '@rmwc/theme/styles';

import { CardRank, CardHandImage, CardImage } from '../../../games/card.js';
import { CardHandComponent } from '../hand.js';

// Properties used for displaying card hands
var handProps = {
  scale: 0.50,
  overlap: true,
  curve: true,
};

var discardProps = {
  overlap: true,
};


class GinGameComponent extends CardHandComponent {
  constructor(props) {
    super(props);

    this.state.round_score = 0;
    this.state.groupings = this.defaultGroupings();
    this.state.grouping_selected = [];
    this.state.confirming = false;
    this.state.sort_ace_high = this.state.game.config.ace_high;

    // FIXME: hack?
    let old_handler = this.state.game.interface.onChange;
    this.state.game.interface.onChange = () => {
      old_handler();
      this.setState(state => {
        if (!state.groupings.length) {
          state.groupings = this.defaultGroupings();
        }
        // Jinx
        return state;
      });
    };
  }
  defaultGroupings() {
    if (this.state.game.interface.laid_down
    && this.state.game.interface.laid_down_id !== this.props.user.id
    && this.state.game.interface.synopsis.players
    && this.state.game.interface.data.round_score === -1
    && this.state.game.interface.my_turn()) {
      for (let other of this.state.game.interface.synopsis.players) {
        if (other.user.id !== this.state.game.interface.laid_down_id) continue;
        if (other.round_score === 0) continue;
        return other.groups || [];
      }
    }
    return [];
  }
  shouldSubmitGroupings() {
    let default_groupings = this.defaultGroupings();
    let added_group = this.state.groupings.length > default_groupings.length;
    if (added_group) {
      return true;
    }
    return false;
  }
  newState(fn, cb) {
    if (!this.state.editable) {
      return;
    }

    return this.setState(state => Object.assign({}, state, fn(state)));
  }
  inputHandler(e) {
    let v = e.target.value;
    this.setState(state => Object.assign({}, state, { "round_score": v }));
  }
  async sendCards() {
    var groups = this.state.groupings;
    var leftover = this.state.game.interface.data.hand.cards.filter(
      card => !this.state.groupings.some(g => g.includes(card.id))
    ).map(c => c.id);

    var resp = await this.state.game.interface.score_by_groups(groups, leftover);
    if (resp && ((resp.type !== "error" && !resp.error) || resp.error === "begin next round")) {
      this.setState(state => {
        state.round_score = 0;
        state.groupings = [];
        state.grouping_selected = [];
        return state;
      })
    } else {
      console.log(resp);
    }
  }
  async sendScore() {
    var resp = await this.state.game.interface.score(this.state.round_score);
    if (resp && ((resp.type !== "error" && !resp.error) || resp.error === "begin next round")) {
      this.setState(state => {
        state.round_score = 0;
        state.groupings = [];
        state.grouping_selected = [];
        return state;
      })
    } else {
      console.log(resp);
    }
  }
  render() {
    var num_players = this.state.game.config.num_players;

    var show_yourself =
      !this.state.game.interface.dealt
      || (this.state.game.interface.laid_down
        && !this.state.game.interface.data.drawn
        && this.state.game.interface.data.round_score !== -1);
    var previous_round_hands = [];
    if ((!this.state.game.interface.dealt || this.state.game.interface.laid_down) && this.state.game.interface.synopsis && this.state.game.interface.synopsis.players) {
      var index_mapping = {};
      for (let array_index in this.state.game.interface.synopsis.players) {
        let player = this.state.game.interface.synopsis.players[array_index];
        if (!player.playing) {
          continue;
        }
        var game_index = player.player_index;
        if (game_index in index_mapping) {
          console.log("Bad game! Different players have the same identifier!", this.state.game.interface.synopsis.players);
        }

        index_mapping[game_index] = array_index;
      }

      for (let game_index in Object.keys(index_mapping).sort()) {
        let player = this.state.game.interface.synopsis.players[index_mapping[game_index]];
        if (+player.user.id === this.props.user.id && !show_yourself) {
          continue
        }

        if (player && player.hand && player.user && player.user.display) {
          previous_round_hands.push(
            <div key={ player.user.id }>
              <h3>{ player.user.display }{ player.round_score !== -1 ? " - " + player.round_score + " point" + ( player.round_score === 1 ? "" : "s" ): null }</h3>
              { player.hand.toImage(handProps) }
            </div>
          );
        }
      }
    }

    var bottom = null;
    if (!this.state.game.interface.started) {
      return <h3>Waiting for game to start …</h3>;
    } else if (this.state.game.interface.finished) {
      return <div>
        <h3>Finished</h3>
      </div>;
    } else if (!this.state.game.interface.dealt) {
      var top = <div>
        <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
          <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
            <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
              <h3>Please wait for the round to begin...</h3>
            </div>
          </c.Card>
        </div>
      </div>;

      if (+this.state.game.interface.data.dealer === +this.props.user.id) {
        top = <div>
          <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
            <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
              <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                <Button label="Deal!" style={{ fontSize: "1.25em" }} unelevated ripple={false} onClick={() => this.state.game.interface.deal()} />
              </div>
            </c.Card>
          </div>
        </div>;
      }

      if (previous_round_hands) {
        bottom = <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
          <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
            <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
              <h2>Last Round Hands</h2>
              { previous_round_hands }
            </div>
          </c.Card>
        </div>;
      }

      return <>
        { top }
        { bottom }
      </>;
    } else if (this.state.game.interface.laid_down) {
      if (this.state.game.interface.data.drawn) {
        return <div>
          <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
            <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
              <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                <h2>{ this.state.game.interface.laid_down_user?.display } laid down!</h2>
                <div className="flexbox">
                  <div className="flexible">
                    <h3>Deck</h3>
                    <CardImage />
                    <p><i>{ this.state.game.interface.data.draw_deck } cards remaining</i></p>
                  </div>
                  <div className="flexible">
                    <h3>Discard Pile</h3>
                    { this.state.game.interface.data.discard?.toImage(discardProps) }
                  </div>
                </div>
                <h3>Final chance!</h3>
                {
                  this.state.game.interface.data.drawn.toImage(
                    Object.assign(
                      {
                        onClick: () => {
                          this.setState(state => {
                            state.selected = state.selected === this.state.game.interface.data.drawn.id ? null : this.state.game.interface.data.drawn.id;
                            return state;
                          });
                        },
                        style: { marginTop: "20px", transform: this.state.selected === this.state.game.interface.data.drawn.id ? "translateY(-20px)" : "" }
                      },
                      { scale: handProps.scale }
                    )
                  )
                } <br />
              <Button label="Discard" unelevated ripple={false} disabled={ this.state.sorting } onClick={() => { this.state.game.interface.discard(this.state.selected, false) ; this.clearSelected() }} />
              </div>
            </c.Card>
          </div>
          <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
            <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
              <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                <h3>Hand</h3>
                { this.renderHand(true) }
                <br/><br/>
                <Switch label={ "Autosort" } checked={this.state.autosort}
                  onChange={e => this.setAutosort(e.currentTarget.checked)}/>
              </div>
            </c.Card>
          </div>
        </div>;
      } else if (this.state.game.interface.data.round_score === -1) {
        if (this.state.game.interface.my_turn()) {
          if (previous_round_hands && previous_round_hands.length > 0) {
            bottom = <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
              <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
                <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                  <l.CollapsibleList className="noscroll" handle={
                    <l.SimpleListItem
                      text={ <h2 style={{ width: "100%" }}>Other players’ Hands</h2> }
                      metaIcon="chevron_right"
                    />
                  }>
                    { previous_round_hands }
                  </l.CollapsibleList>
                </div>
              </c.Card>
            </div>;
          }

          var ungrouped = this.state.game.interface.data.hand
            .cardSortIf(this.state.autosort)(false,false)
            .cards.filter(
              card => !this.state.groupings.some(g => g.includes(card.id))
            );
          var ungrouped_score = 0;
          for (let c of ungrouped) {
            var sc = c.rank.value;
            if (sc > 10) {
              if (c.rank.value === CardRank.JOKER) {
                sc = 20;
              } else {
                sc = 10;
              }
            } else if (sc === 1 && this.state.game.config.ace_high) {
              sc = 15;
            }

            ungrouped_score += sc;
          }
          var superhand_cards = this.state.game.interface.data.hand.cards;
          if (this.state.game.interface.laid_down && this.state.game.interface.laid_down_id !== this.props.user.id && this.state.game.interface.synopsis.players) {
            for (let other of this.state.game.interface.synopsis.players) {
              if (other.user.id !== this.state.game.interface.laid_down_id) continue;
              if (+other.round_score === 0) continue;
              superhand_cards = superhand_cards.concat(other.hand.cards);
            }
          }
          var groupings = this.state.groupings.map(group => group.map(g =>
            superhand_cards.find(c => c.id === g)
          ).filter(g => g)).filter(g => g);

          return <div>
            {/*<div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
              <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
                <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                  <h2>{ this.state.game.interface.laid_down_user?.display } laid down!</h2>
                  <div className="flexbox">
                    <div className="flexible">
                      <h3>Deck</h3>
                      <CardImage />
                    </div>
                    <div className="flexible">
                      <h3>Discard Pile</h3>
                      { this.state.game.interface.data.discard?.toImage(discardProps) }
                    </div>
                  </div>
                  <h3>Score Your Hand</h3>
                  <TextField fullwidth type="number" label="Score" name="score" value={ this.state.round_score } onChange={ this.inputHandler.bind(this) } min="0" max="250" step="1" />
                  <Button label="Submit" unelevated ripple={false} onClick={ this.sendScore.bind(this) } />
                </div>
              </c.Card>
            </div>*/}
            <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
              <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
                <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                  <h2>{ this.state.game.interface.laid_down_user?.display } laid down!</h2>
                  <h3>Group your hand so it can be scored!</h3>
                  <p>Make runs of three or more consecutive cards{this.state.game.interface.data.config.same_suit_runs ? " of the same suit" : ""}, or groups of three or more of a kind.</p>
                  <p>These groups will be verified when you submit your score.</p>
                  <p>Any leftover cards will be counted against your score this round.</p>
                  <p>When your opponent goes out with points left in their hand, you can play off their existing groups.</p>
                  <br/>
                  <h3>Your Hand</h3>
                  <h4>Points: { ungrouped_score }</h4>
                  <CardHandImage {...handProps}>
                    { ungrouped.map(card =>
                        <CardImage key={ card.id } card={ card } scale={ handProps.scale }
                          selected={ this.state.grouping_selected.includes(card.id) }
                          onClick={ () => this.setState(state => {
                            var i = state.grouping_selected.indexOf(card.id);
                            if (i !== -1) {
                              state.grouping_selected.splice(i, 1);
                            } else {
                              state.grouping_selected.push(card.id);
                            }
                            return state;
                          }) }/>
                    )}
                  </CardHandImage>
                  <br/><br/>
                  { groupings.map((g,i) =>
                      <CardHandImage key={ i } overlap cards={ g } style={{ display: "inline-block", marginRight: "1.5em" }}>
                        {g.map((card,j) => (
                          <CardImage key={ card.id } card={ card }
                            onClick={() => this.setState(state => {
                              if (!this.state.game.interface.data.hand.cards.includes(card))
                                return state;
                              state.groupings[i].splice(j, 1);
                              if (!state.groupings[i].length) {
                                state.groupings.splice(i, 1);
                              }
                              return state;
                            })}/>
                        )).concat(!ungrouped.length ? [] : [
                          <CardImage key={ null } overlay={ <h3>Add selected cards to this group</h3> }
                            onClick={() => this.setState(state => {
                              if (state.grouping_selected.length) {
                                state.groupings[i].push(...state.grouping_selected);
                                state.grouping_selected = [];
                              }
                              return state;
                            })}
                          />
                        ])}
                      </CardHandImage>
                  ).concat(!ungrouped.length ? [] : [
                    <CardHandImage key={ null } style={{ display: "inline-block" }}>
                      {[
                        <CardImage key={ null } overlay={ <h3>New group of selected cards</h3> }
                          onClick={() => this.setState(state => {
                            if (state.grouping_selected.length) {
                              state.groupings.push(state.grouping_selected);
                              state.grouping_selected = [];
                            }
                            return state;
                          })}
                        />
                      ]}
                    </CardHandImage>
                  ]) }
                  <br /><br />
                  <div>
                    <Button label={ "Submit Score of " + ungrouped_score }
                      raised={ !ungrouped_score }
                      unelevated ripple={false} onClick={ this.shouldSubmitGroupings() ? this.sendCards.bind(this) : () => this.setState(state => Object.assign(state, {confirming:true})) } />
                    <d.Dialog
                      open={this.state.confirming}
                      onClose={evt => {
                        this.setState(state => Object.assign(state, {confirming:false}));
                        if (evt.detail.action === "accept") {
                          this.sendCards();
                        }
                      }}
                    >
                      <d.DialogTitle>Confirm score</d.DialogTitle>
                      <d.DialogContent>You have no groups. Are you sure you want to submit a score of { ungrouped_score + " point"+(ungrouped_score===1?"":"s")}?</d.DialogContent>
                      <d.DialogActions>
                        <Theme use={['secondary']}>
                          <d.DialogButton theme={['secondary']} action="close">Cancel</d.DialogButton>
                          <d.DialogButton theme={['secondary']} action="accept" isDefaultAction>
                            Yes, I am sure
                          </d.DialogButton>
                        </Theme>
                      </d.DialogActions>
                    </d.Dialog>
                  </div>
                </div>
              </c.Card>
            </div>
            { bottom }
          </div>;
        } else {
          return <>
            <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
              <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
                <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                  <p>Please wait for the other player to score their hand.</p>
                </div>
              </c.Card>
            </div>
            <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
              <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
                <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                  <h3>Hand</h3>
                  { this.renderHand(false) }
                </div>
              </c.Card>
            </div>
          </>;
        }
      } else {
        bottom = <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
          <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
            <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
              <h3>Hand</h3>
              { this.renderHand(false) }
            </div>
          </c.Card>
        </div>;
        if (previous_round_hands && previous_round_hands.length > 0) {
          bottom = <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
            <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
              <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                <h2>All Hands</h2>
                { previous_round_hands }
              </div>
            </c.Card>
          </div>;
        }

        return <div>
          <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
            <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
              <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                <h2>{ this.state.game.interface.laid_down_user?.display } laid down!</h2>
                <div className="flexbox">
                  <div className="flexible">
                    <h3>Deck</h3>
                    <CardImage />
                    <p><i>{ this.state.game.interface.data.draw_deck } cards remaining</i></p>
                  </div>
                  <div className="flexible">
                    <h3>Discard Pile</h3>
                    { this.state.game.interface.data.discard?.toImage(discardProps) }
                  </div>
                </div>
                <h3>Please wait for others to score their hands...</h3>
                <b>Your Score:</b> { this.state.game.interface.data.round_score }
              </div>
            </c.Card>
          </div>
          { bottom }
        </div>;
      }
    } else if (this.state.game.interface.my_turn()) {
      // Note that turn doesn't really matter if we've gone out.
      if (!this.state.game.interface.data.drawn) {
        return <div>
          <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
            <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
              <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                <div className="flexbox">
                  <div className="flexible">
                    <h3>Deck</h3>
                    <CardImage onClick={ () => this.state.game.interface.takeTop() } />
                    <p><i>{ this.state.game.interface.data.draw_deck } cards remaining</i></p>
                  </div>
                  <div className="flexible">
                    <h3>Discard Pile</h3>
                    {
                      this.state.game.interface.data.discard?.toImage(
                        Object.assign(
                          {
                            onClick: () => this.state.game.interface.takeDiscard()
                          },
                          discardProps
                        )
                      )
                    }
                  </div>
                </div>
                <h2>Your turn! Which card would you like to pick up?</h2>
                <Button label="From Deck" unelevated ripple={false} onClick={() => this.state.game.interface.takeTop()} />
                &nbsp;&nbsp;
                &nbsp;&nbsp;
                <Button label="From Discard" unelevated ripple={false} onClick={() => this.state.game.interface.takeDiscard()} />
              </div>
            </c.Card>
          </div>
          <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
            <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
              <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                <h3>Hand</h3>
                { this.renderHand(false) }
                <br/><br/>
                <Switch label={ "Autosort" } checked={this.state.autosort}
                  onChange={e => this.setAutosort(e.currentTarget.checked)}/>
              </div>
            </c.Card>
          </div>
        </div>;
      } else {
        return <div>
          <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
            <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
              <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                <div className="flexbox">
                  <div className="flexible">
                    <h3>Deck</h3>
                    <CardImage />
                    <p><i>{ this.state.game.interface.data.draw_deck } cards remaining</i></p>
                  </div>
                  <div className="flexible">
                    <h3>Discard Pile</h3>
                    { this.state.game.interface.data.discard?.toImage(discardProps) }
                  </div>
                </div>
                <h3>Picked Up</h3>
                {
                  this.state.game.interface.data.drawn.toImage(
                    Object.assign(
                      {
                        onClick: () => {
                          this.setState(state => {
                            state.selected = state.selected === this.state.game.interface.data.drawn.id ? null : this.state.game.interface.data.drawn.id;
                            return state;
                          });
                        },
                        style: { marginTop: "20px", transform: this.state.selected === this.state.game.interface.data.drawn.id ? "translateY(-20px)" : "" }
                      },
                      { scale: handProps.scale }
                    )
                  )
                } <br />
                <Button label="Discard" unelevated ripple={false} disabled={ this.state.sorting } onClick={() => { this.state.game.interface.discard(this.state.selected, false) ; this.clearSelected() }} />
                &nbsp;&nbsp;
                &nbsp;&nbsp;
                &nbsp;&nbsp;
                <Button label="Go Out" unelevated ripple={false} disabled={ this.state.sorting } onClick={() => { this.state.game.interface.discard(this.state.selected, true)  ; this.clearSelected() }} />
              </div>
            </c.Card>
          </div>
          <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
            <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
              <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                <h3>Hand</h3>
                { this.renderHand(true) }
                <br/><br/>
                <Switch label={ "Autosort" } checked={this.state.autosort}
                  onChange={e => this.setAutosort(e.currentTarget.checked)}/>
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
              <div className="flexbox">
                <div className="flexible">
                  <h3>Deck</h3>
                  <CardImage />
                  <p><i>{ this.state.game.interface.data.draw_deck } cards remaining</i></p>
                </div>
                <div className="flexible">
                  <h3>Discard Pile</h3>
                  { this.state.game.interface.data.discard?.toImage(discardProps) }
                </div>
              </div>
              <h3>Waiting for the other { "player" + (num_players < 3 ? "" : "s") } to play …</h3>
            </div>
          </c.Card>
        </div>
        <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
          <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
            <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
              <h3>Hand</h3>
              { this.renderHand(false) }
              <br/><br/>
              <Switch label={ "Autosort" } checked={this.state.autosort}
                onChange={e => this.setAutosort(e.currentTarget.checked)}/>
            </div>
          </c.Card>
        </div>
      </div>;
    }
  }
}

export {
  GinGameComponent
};
