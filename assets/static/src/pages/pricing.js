import React from 'react';

import { Link } from "react-router-dom";

import '@rmwc/card/styles';
import '@rmwc/dialog/styles';
import '@rmwc/list/styles';
import '@rmwc/slider/styles';
import '@rmwc/typography/styles';

import * as c from '@rmwc/card';
import * as d from '@rmwc/dialog';
import * as l from '@rmwc/list';
import { Slider } from '@rmwc/slider';
import { Typography } from '@rmwc/typography';

import { PlanModel } from '../models.js';

import { loadStripe } from '@stripe/stripe-js/pure';

function centsToDollar(value) {
  var dollars = parseInt(value / 100);
  var cents = "" + (value % 100) + "";
  if (cents.length === 1) {
    cents = cents + "0";
  }
  return '$' + dollars + "." + cents;
}

function isUnit(value_in_unit, name, max) {
  if (max === undefined || max === null) {
    max = 10;
  }

  if (1 <= value_in_unit && value_in_unit < max) {
    if (parseInt(value_in_unit) <= 1) {
      return "per " + name;
    }

    return "per " + parseInt(value_in_unit) + " " + name + "s";
  }

  return "";
}

function timeToUnit(value, is_party) {
  var nanoseconds = value;
  var microseconds = nanoseconds / 1000;
  var miliseconds = microseconds / 1000;
  var seconds = miliseconds / 1000;
  var minutes = seconds / 60;
  var hours = minutes / 60;
  var days = hours / 24;
  var weeks = days / 7;
  var months = days / (365 / 12);
  var years = days / 365;
  var decades = years / 10;

  if (parseInt(value) === 0 || decades > 10) {
    if (!is_party) {
      return "once";
    } else {
      return "per party";
    }
  }

  var ret = "";
  ret += isUnit(nanoseconds, "nanosecond");
  ret += isUnit(microseconds, "microsecond");
  ret += isUnit(miliseconds, "milisecond");
  ret += isUnit(seconds, "second");
  ret += isUnit(minutes, "minute");
  ret += isUnit(hours, "hour");
  ret += isUnit(days, "day");
  ret += isUnit(weeks, "week", 4);
  ret += isUnit(months, "month", 12);
  ret += isUnit(years, "year");
  ret += isUnit(decades, "decade");

  return ret;
}

class PlanDetails extends React.Component {
  render() {
    var plan = this.props.plan;

    var room_details = null;
    // Game settings
    if (plan.max_total_games) {
      if (plan.max_total_games !== -1) {
        room_details = <> {room_details} <b>Games:</b> { plan.max_total_games } total <br /> </>
      } else {
        room_details = <> {room_details} <b>Games:</b> Unlimited <br /> </>
      }
    } else if (plan.max_total_games_in_room) {
      if (plan.max_total_games_in_room !== -1) {
        room_details = <> {room_details} <b>Games:</b> { plan.max_total_games_in_room } per room <br /> </>
      } else {
        room_details = <> {room_details} <b>Games:</b> Unlimited <br /> </>
      }
    }
    // Player settings
    if (plan.max_players_in_game) {
      if (plan.max_players_in_game !== -1) {
        room_details = <> {room_details} <b>Players:</b> { plan.max_players_in_game } total <br /> </>
      } else {
        room_details = <> {room_details} <b>Players:</b> Unlimited <br /> </>
      }
    } else if (plan.max_players_in_room && plan.max_players_in_game_in_room &&
                plan.max_players_in_room !== -1 && plan.max_players_in_game_in_room !== -1) {
      room_details = <> {room_details} <b>Players:</b> { plan.max_players_in_room } per room, { plan.max_players_in_game_in_room } per game per room <br /> </>
    } else if (plan.max_players_in_room && plan.max_players_in_room !== -1) {
      room_details = <> {room_details} <b>Players:</b> { plan.max_players_in_room } per room <br /> </>
    } else if (plan.max_players_in_game_in_room && plan.max_players_in_game_in_room !== -1) {
      room_details = <> {room_details} <b>Players:</b> { plan.max_players_in_game_in_room } per game per room <br /> </>
    } else {
      // Unlimited
      room_details = <> {room_details} <b>Players:</b> Unlimited <br /> </>
    }
    // Room settings
    if (plan.create_room) {
      if (plan.max_total_rooms) {
        if (plan.max_total_rooms !== -1) {
          room_details = <> {room_details} <b>Rooms:</b> { plan.max_total_rooms } total <br /> </>
        } else {
          room_details = <> {room_details} <b>Rooms:</b> Unlimited <br /> </>
        }
      } else {
        room_details = <> {room_details} <b>Rooms:</b> None <br /> </>
      }
    } else {
      room_details = <> {room_details} <b>Rooms:</b> None <br /> </>
    }
    // NOTE: This statement needs to be the last assignment for room_details
    room_details = <> <p> {room_details} </p> </>

    var game_details = null;
    var av_details = null;
    if (false) {
      if (this.props.plan.can_audio_chat) {
        av_details = <> {av_details} <p>Able to connect to audio during game play.</p> </>
      }
      if (this.props.plan.can_video_chat) {
        av_details = <> {av_details} <p>Able to connect to video during game play.</p> </>
      }
    }

    return (
      <div>
        { room_details }
        { game_details }
        { av_details }
      </div>
    )
  }
}

class ActivePricingPage extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      plans: null,
      plan_map: null,
      user_plans: null,
      user_plan_map: null
    }
  }

  async componentDidMount() {
    var all_plans = await PlanModel.active().catch(error => {
      return {
        'type': 'error',
        'error': error,
      };
    });

    if ('type' in all_plans && all_plans.error !== null) {
      console.log(all_plans.error);
      return;
    }

    // Retrieve user plan data (like profile.js)
    if (this.props.user) {
      var user_plans = await this.props.user.plans();
      var user_plan_map = {};

      for (let plan of user_plans) {
        user_plan_map[plan.plan_id] = plan;
      }

      this.setState(state => Object.assign({}, state, { user_plans, user_plan_map }));
    }

    var by_price = [];
    var plan_map = {};
    for (let index in all_plans) {
      var plan = await all_plans[index];
      plan_map[plan.id] = plan;
      var target_index = null;
      for (let by_price_index in by_price) {
        var sorted_plan = by_price[by_price_index];
        if (+sorted_plan.min_price_cents >= +plan.min_price_cents) {
          target_index = by_price_index;
          break;
        }
      }

      if (target_index === null) {
          target_index = by_price.length;
      }

      by_price.splice(target_index, 0, plan);
    }

    this.setState(state => Object.assign({}, state, { plans: by_price, plan_map }));
  }

  setPlanPrice(plan, event) {
    var plans = this.state.plans;
    for (let plan_index in plans) {
      if (plans[plan_index].id === plan.id) {
        plans[plan_index].suggested_price_cents = parseInt(event.currentTarget.value * 100);
      }
    }
    this.setState(state => Object.assign({}, state, { plans }));
  }

  render() {
    var active_plans = [];
    if (this.state.plans) {
      for (let plan of this.state.plans) {
        var price = null;
        var party = plan.name.indexOf("Party") !== -1;
        if (plan.open && plan.min_price_cents >= 0 && plan.max_price_cents >= 0) {
          if (plan.min_price_cents !== plan.max_price_cents) {
            price = <div className="text-left">
              <i>Suggested</i> price: <b>{ centsToDollar(plan.suggested_price_cents) }</b> { timeToUnit(plan.billed, party) }
              <Slider value={ plan.suggested_price_cents / 100 } onChange={ (evt) => this.setPlanPrice(evt) } onInput={ (evt) => this.setPlanPrice(evt) } discrete step={0.50} min={ plan.min_price_cents / 100 } max={ plan.max_price_cents / 100}  />
            </div>
          } else {
            price = <div className="text-left">
              Price: <b>{ centsToDollar(plan.suggested_price_cents) }</b> { timeToUnit(plan.billed, party) }
            </div>
          }
        } else if (plan.slug === "free") {
          price = <i>Freely given to all users; limit one.</i>
        } else {
          price = <i>Unavailable</i>
        }

        active_plans.push(
          <div className="flexible" style={{ margin: "1rem" }} key={ plan.name }>
            <c.Card style={{ 'width': '300px' }}>
              <div style={{ padding: "1rem" }}>
                <Typography use="headline5">{ plan.name }</Typography>
                <Typography className="text-left" use="body">{ plan.description }</Typography>

                <l.List>
                  <l.CollapsibleList handle={
                      <l.SimpleListItem text={ <b>Details</b> } metaIcon="chevron_right" />
                    }
                  >
                    <PlanDetails {...this.props} plan={ plan } />
                  </l.CollapsibleList>
                </l.List>

                { price }
              </div>
              {
                (this.state.user_plans && this.state.user_plan_map[plan.id] &&
                  this.state.plan_map[plan.id].max_total_games > this.state.user_plan_map[plan.id].games().length
                ?
                  <c.CardActions>
                    <c.CardActionButton onClick={ () => this.props.setPage('profile/plans') } theme="secondary">Active</c.CardActionButton>
                  </c.CardActions>
                : ((this.props.user !== undefined && this.props.user !== null && this.props.user.authed && plan.open) ?
                    <c.CardActions>
                      <c.CardActionButton onClick={ () => this.props.setSelected(plan) } theme="secondary">Select</c.CardActionButton>
                    </c.CardActions>
                  :
                    null))
              }
            </c.Card>
          </div>
        );
      }
    }

    return (
      <>
        { active_plans }
      </>
    );
  }
}

class PurchasePage extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      price: this.props.plan.suggested_price_cents,
      error: null,
    }
  }

  setPlanPrice(event) {
    this.props.plan.suggested_price_cents = parseInt(event.currentTarget.value * 100);
    this.setState(state => Object.assign({}, state, { price: this.props.plan.suggested_price_cents }));
  }

  async checkout() {
    this.props.plan.token = this.props.user.token;
    var data = await this.props.plan.checkout(this.props.plan.suggested_price_cents, this.props.user.token);

    if ('type' in data && data['type'] === 'error') {
      this.setError(data.message);
      return;
    }

    var stripe = await loadStripe(data.stripe_publishable_key);
    stripe.redirectToCheckout({ sessionId: data.stripe_session_id });
  }

  setError(message) {
    this.setState(state => Object.assign({}, state, { error: message }));
  }

  render() {
    var plan = this.props.plan;
    var party = plan.name.indexOf("Party") !== -1;
    var price = null;

    if (plan.open && plan.min_price_cents >= 0 && plan.max_price_cents >= 0) {
      if (plan.min_price_cents !== plan.max_price_cents) {
        price = <div className="text-left">
          <i>Suggested</i> price: <b>{ centsToDollar(plan.suggested_price_cents) }</b> { timeToUnit(plan.billed, party) }
          <Slider value={ plan.suggested_price_cents / 100 } onChange={ (evt) => this.setPlanPrice(evt) } onInput={ (evt) => this.setPlanPrice(evt) } discrete step={0.50} min={ plan.min_price_cents / 100 } max={ plan.max_price_cents / 100}  />
        </div>
      } else {
        price = <div className="text-left">
          Price: <b>{ centsToDollar(plan.suggested_price_cents) }</b> { timeToUnit(plan.billed, party) }
        </div>
      }
    } else {
      this.setSelected(null);
    }

    return (
      <div className="flexible" style={{ margin: "1rem" }}>
        <c.Card>
          <div style={{ padding: "1rem" }}>
            <Typography use="headline5">{ plan.name }</Typography>
            <Typography className="text-left" use="body">{ plan.description }</Typography>

            <l.List>
              <l.CollapsibleList handle={
                  <l.SimpleListItem text={ <b>Details</b> } metaIcon="chevron_right" />
                }
              >
                <PlanDetails {...this.props} plan={ plan } />
              </l.CollapsibleList>
            </l.List>

            { price }
          </div>
          <c.CardActions>
            <c.CardActionButton onClick={ () => this.checkout() } theme="secondary">Purchase</c.CardActionButton>
            <c.CardActionButton onClick={ () => this.props.setSelected(null) } theme="secondary">Cancel</c.CardActionButton>
          </c.CardActions>
        </c.Card>
        <d.Dialog open={ this.state.error !== null } onClosed={() => this.setError(null) }>
          <d.DialogTitle>Error!</d.DialogTitle>
          <d.DialogContent>{ this.state.error }</d.DialogContent>
          <d.DialogActions>
            <d.DialogButton action="close">OK</d.DialogButton>
          </d.DialogActions>
        </d.Dialog>
      </div>
    );
  }
}

class PricingPage extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      selected: null,
    };
  }

  setSelected(plan) {
    this.setState(state => Object.assign({}, state, { selected: plan }));
  }

  render() {
    return (
      <div className="App-page">
        <div>
          <Typography use="headline2">Pricing Information</Typography>
          <Typography use="body">
            We&#39;re looking to refine our pricing structure over time. Currently
            we&#39;ve activated the following plans:
          </Typography>
          {
            this.props.user === undefined || this.props.user === null || !this.props.user.authed
            ? <Typography use="body2">
                Note: you must first log in to purchase a plan and add it to
                your account.
              </Typography>
            : null
          }
        </div>
        <div className="flexbox">
          { this.state.selected === null
            ? <ActivePricingPage {...this.props} setSelected={ this.setSelected.bind(this) } />
            : <PurchasePage {...this.props} setSelected={ this.setSelected.bind(this) } plan={ this.state.selected } />
          }
        </div>
        <div>
          <Typography use="body">
            For more information on the plans you have purchased, visit your <Link to="/profile/plans" target="_blank" >Plans</Link> in <Link to="/profile" target="_blank" >Account Preferences</Link>.
          </Typography>
        </div>
      </div>
    );
  }
}

export {
  PricingPage,
}
