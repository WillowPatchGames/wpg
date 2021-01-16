import React from 'react';

import '../../main.scss';

import { gravatarify } from '../../utils/gravatar.js';

import { Avatar } from '@rmwc/avatar';
import '@rmwc/avatar/styles';
import { Button } from '@rmwc/button';
import '@rmwc/card/styles';
import * as c from '@rmwc/card';
import '@rmwc/button/styles';
import * as l from '@rmwc/list';
import '@rmwc/list/styles';
import { CircularProgress } from '@rmwc/circular-progress';
import '@rmwc/circular-progress/styles';
import { Switch } from '@rmwc/switch';
import '@rmwc/switch/styles';
import { Tooltip } from '@rmwc/tooltip';
import '@rmwc/tooltip/styles';
import { Theme } from '@rmwc/theme';
import '@rmwc/theme/styles';
import * as d from '@rmwc/dialog';
import '@rmwc/dialog/styles';

import { loadGame, addEv, notify } from '../games.js';
import { UserCache } from '../../utils/cache.js';
import { CardRank, CardHandImage, CardImage } from '../../games/card.js';
import { team_colors } from './team_colors.js';

var autosort_persistent = true;

// Properties used for displaying card hands
var handProps = {
  scale: 0.50,
  overlap: true,
  curve: true,
};

class ThreeThirteenGameComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.state.game = props.game;
    this.state.selected = null;
    this.state.round_score = 0;
    this.state.groupings = [];
    this.state.grouping_selected = [];
    this.state.confirming = false;
    this.state.autosort = false;
    this.state.sorting = null;
    // FIXME: hack?
    let old_handler = this.state.game.interface.onChange;
    this.state.game.interface.onChange = () => {
      old_handler();
      this.setState(state => {
        if (autosort_persistent && state.autosort) {
          this.state.game.interface.data.hand.cardSort(false, false);
        }
        // Jinx
        return state;
      });
    };
  }
  clearSelected() {
    return this.setState(state => Object.assign({}, state, { selected: null }));
  }
  selecting(card) {
    return Object.assign(card, {
      selected: card.id === this.state.selected,
      onClick: () => {
        this.setState(state => {
          state.selected = card.id;
          return state;
        });
      },
    });
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
    if (resp && resp.type !== "error" && !resp.error) {
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
    if (resp && resp.type !== "error" && !resp.error) {
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
  setAutosort(autosort) {
    this.setState(state => {
      state.autosort = autosort;
      if (autosort_persistent && autosort) {
        this.state.game.interface.data.hand.cardSort(false, false);
      }
      return state;
    });
  }
  sort() {
    this.setState(state => {
      if (!state.sorting) {
        state.sorting = [];
      } else {
        state.autosort = false;
        state.game.interface.sort(state.sorting);
        state.sorting = null;
      }
      return state;
    });
  }
  renderHand(selecting) {
    var selected = card => {
      if (!this.state.sorting) {
        if (!selecting) return;
        return card.id === this.state.selected;
      }
      return this.state.sorting.includes(card.id);
    };
    var select = card => {
      this.setState(state => {
        if (!state.sorting) {
          if (!selecting) return state;
          return Object.assign(state, {selected:card.id});
        }
        var i = state.sorting.findIndex(id => id === card.id);
        if (i >= 0) {
          state.sorting.splice(i, 1);
        } else {
          state.sorting.push(card.id);
        }
        return state;
      });
    };
    var badger = card => {
      if (!this.state.sorting) return;
      var i = this.state.sorting.findIndex(id => id === card.id);
      if (i >= 0) return +i+1;
      return null;
    }

    var sideStyle = {
      writingMode: "vertical-rl",
      textOrientation: "mixed",
      textAlign: "end",
      fontWeight: 600,
      height: "calc(100% - 1em)",
      marginRight: "auto",
      paddingBottom: "0.5em",
    };
    var modeStyle = {
      alignSelf: "start",
      fontWeight: 800,
      marginRight: "0.5em",
      fontSize: "1.2em",
    };
    var sortMessage =
      this.state.sorting
      ? this.state.sorting.length
        ? this.state.sorting.length === 1
          ? "Put card here"
          : "Put cards here"
        : "Select cards to put here"
      : "Sort cards here";
    var sortMode = this.state.sorting ? "Sorting" : null;
    var sortOverlay = <>
      { <span style={sideStyle}>{ sortMessage }</span> }
      { <span style={modeStyle}>{ sortMode }</span> }
    </>;

    var cards = this.state.game.interface.data.hand
      .cardSortIf(this.state.autosort)(false,false).cards;

    return (
      <CardHandImage {...handProps}>
        { [
          <CardImage key={ "action" } overlay={ sortOverlay }
            scale={handProps.scale} selected={!!this.state.sorting}
            onClick={() => this.sort()}/>
        ].concat(cards.map((card,i) =>
          <CardImage card={ card } key={ card.id }
            scale={handProps.scale}
            selected={ selected(card) }
            badge={ badger(card) }
            onClick={() => select(card)}
            />
        ))}
      </CardHandImage>
    );
  }
  render() {
    var num_players = this.state.game.config.num_players;

    var discardProps = {
      overlap: true,
    };

    var show_yourself =
      !this.state.game.interface.dealt
      || (this.state.game.interface.laid_down
        && !this.state.game.interface.data.drawn
        && this.state.game.interface.data.round_score !== -1);
    var previous_round_hands = [];
    if ((!this.state.game.interface.dealt || this.state.game.interface.laid_down) && this.state.game.interface.synopsis && this.state.game.interface.synopsis.players) {
      var index_mapping = {};
      for (let array_index in this.state.game.interface.synopsis.players) {
        var game_index = this.state.game.interface.synopsis.players[array_index].player_index;
        if (game_index in index_mapping) {
          console.log("Bad game! Different players have the same identifier!", this.state.game.interface.synopsis.players);
        }

        index_mapping[game_index] = array_index;
      }

      for (let game_index in Object.keys(index_mapping).sort()) {
        var player = this.state.game.interface.synopsis.players[index_mapping[game_index]];
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
                <h2>{ this.state.game.interface.laid_down_user.display } laid down!</h2>
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
                <h3>Final chance!</h3>
                {
                  this.state.game.interface.data.drawn.toImage(
                    Object.assign(
                      {
                        onClick: () => {
                          this.setState(state => {
                            state.selected = this.state.game.interface.data.drawn.id;
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
        var groupings = this.state.groupings.map(group => group.map(g =>
          this.state.game.interface.data.hand.cards.find(c => c.id === g)
        ));

        return <div>
          {/*<div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
            <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
              <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
                <h2>{ this.state.game.interface.laid_down_user.display } laid down!</h2>
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
                <h2>{ this.state.game.interface.laid_down_user.display } laid down!</h2>
                <h3>Group your hand so it can be scored!</h3>
                <p>Make runs of three or more consecutive cards{this.state.game.interface.data.config.same_suit_runs ? " of the same suit" : ""}, or groups of three or more of a kind.</p>
                <p>These groups will be verified when you submit your score.</p>
                <p>Any leftover cards will be counted against your score this round.</p>
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
                <br/><br/>
                <div>
                  <Button label={ "Submit Score of " + ungrouped_score }
                    raised={ !ungrouped_score }
                    unelevated ripple={false} onClick={ this.state.groupings.length ? this.sendCards.bind(this) : () => this.setState(state => Object.assign(state, {confirming:true})) } />
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
                <h2>{ this.state.game.interface.laid_down_user.display } laid down!</h2>
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
                            state.selected = this.state.game.interface.data.drawn.id;
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

class ThreeThirteenGameSynopsis extends React.Component {
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
    let new_state = {
      indexed_players: {},
      spectators: {},
      round: this.props.game.interface.data.round,
      remaining: this.props.game.interface.synopsis.remaining,
      discarded: this.props.game.interface.synopsis.discarded,
    };

    if (this.props.game.interface.synopsis && this.props.game.interface.synopsis.players) {
      for (let player of this.props.game.interface.synopsis.players) {
        if (player.player_index !== -1) {
          new_state.indexed_players[player.player_index] = player;
        } else {
          new_state.spectators[player.user.id] = player;
        }
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
        <Tooltip align="right" content={ user.display } activateOn={['click']} leaveDelay={ 300 }>
          <div className={"avatar-progress avatar-progress--"+(user.id === this.props.user.id ? "xlarge" : "large")} style={{ display: "inline-block" }}>
            <Avatar src={ gravatarify(user) } name={ user.display }
              size={ user.id === this.props.user.id ? "xlarge" : "large" } />
            { !player.is_turn || this.props.game.interface.laid_down || !this.props.game.interface.dealt ? null :
              <CircularProgress size={ user.id === this.props.user.id ? "xlarge" : "large" } style={{
                "--stroke-color": team_colors[+player.team+1],
              }} />
            }
          </div>
        </Tooltip>,
      },
      "is_dealer":{
        name: "Dealing",
        printer: a => a ? sigil("♠") : "",
      },
      "has_laid_down":{
        name: "Laid Down",
        printer: a => a ? sigil("♠") : "",
      },
      "round_score":{
        name: "Round Score",
        printer: a => a === -1 ? " " : a,
      },
      "score":"Score",
    };
    var spectator_columns = {
      "user":{
        name: "User",
        printer: user => <Avatar src={ gravatarify(user) } name={ user.display } size={ user.id === this.props.user.id ? "xlarge" : "large" } />,
      },
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

    var remaining = [];

    var player_rows = [];
    if (this.state.indexed_players) {
      remaining = [];

      for (let player_index of Object.keys(this.state.indexed_players).sort()) {
        let player = this.state.indexed_players[player_index];
        remaining.push(player);
      }

      player_rows.push(...tabulate(synopsis_columns)(remaining));
    }

    var spectator_rows = [];
    if (this.state.spectator_rows) {
      remaining = [];

      for (let spectator_id of Object.keys(this.state.spectator_rows).sort()) {
        let player = this.state.spectator_rows[spectator_id];
        remaining.push(player);
      }

      player_rows.push(...tabulate(spectator_columns)(remaining));
    }

    var player_view = null;
    if (player_rows) {
      player_view = <table style={{ "textAlign": "center" }}>
        <tbody>
          <tr key={ "ThreeThirteen_synopsis_headings" }>
            { headings }
          </tr>
          { player_rows }
          { spectator_rows }
        </tbody>
      </table>
    }

    return (
      <div style={{ width: "90%" , margin: "0 auto 1em auto" }}>
        <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
          <div className="text-left scrollable-x">
            <b>Three Thirteen</b> - { this.state.round } cards / { this.state.remaining } cards remaining / { this.state.discarded } cards discarded<br />
            { player_view }
          </div>
        </c.Card>
      </div>
    );
  }
}

class ThreeThirteenGamePage extends React.Component {
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
        <ThreeThirteenGameSynopsis game={ this.game } {...this.props} />
        <ThreeThirteenGameComponent game={ this.game } interface={ this.state.interface } notify={ (...arg) => notify(this.props.snackbar, ...arg) } {...this.props} />
      </div>
    );
  }
}

class ThreeThirteenAfterPartyPage extends React.Component {
  constructor(props) {
    super(props);

    this.game = loadGame(this.props.game);
    this.props.setGame(this.game);
  }
  returnToRoom() {
    if (this.props.game.interface) {
      this.props.game.interface.close();
    }

    this.props.game.interface = null;

    this.props.setGame(null);
    this.props.setPage("room", true);
  }

  render() {
    return (
      <div>
        <ThreeThirteenGameSynopsis game={ this.game } {...this.props} />
        {
          this.props.room ? <Button onClick={ () => this.returnToRoom() } raised >Return to Room</Button> : <></>
        }
      </div>
    );
  }
}

export {
  ThreeThirteenGamePage,
  ThreeThirteenAfterPartyPage,
};
