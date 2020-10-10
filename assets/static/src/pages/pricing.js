import React from 'react';

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

import { loadStripe } from '@stripe/stripe-js';

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
  var months = days / (365.4 / 12);
  var years = days / 365.4;
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
    if (plan.create_room) {
      if (plan.max_open_rooms) {
        room_details = <> {room_details} <p>Can create and play in up to { plan.max_open_rooms } rooms at a time.</p> </>
      }
    }

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
      plans: null
    }
  }

  async componentDidMount() {
    var plans = await PlanModel.active();
    this.setState(state => Object.assign({}, state, { plans }));
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
          price = <div className="text-left">
            <i>Suggested</i> price: <b>{ centsToDollar(plan.suggested_price_cents) }</b> { timeToUnit(plan.billed, party) }
            <Slider value={ plan.suggested_price_cents / 100 } onChange={ (evt) => this.setPlanPrice(plan, evt) } onInput={ (evt) => this.setPlanPrice(plan, evt) } discrete step={0.50} min={ plan.min_price_cents / 100 } max={ plan.max_price_cents / 100}  />
          </div>
        } else if (plan.slug === "free") {
          price = <i>Freely given to all users; limit one.</i>
        } else {
          price = <i>Unavailable</i>
        }

        active_plans.push(
          <div className="flexible" style={{ margin: "1rem" }}>
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
                this.props.user !== undefined && this.props.user !== null && this.props.user.authed && plan.open
                ?
                  <c.CardActions>
                    <c.CardActionButton onClick={ () => this.props.setSelected(plan) } theme="secondary">Buy</c.CardActionButton>
                  </c.CardActions>
                : null
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
      price = <div className="text-left">
        <i>Suggested</i> price: <b>{ centsToDollar(plan.suggested_price_cents) }</b> { timeToUnit(plan.billed, party) }
        <Slider value={ plan.suggested_price_cents / 100 } onChange={ (evt) => this.setPlanPrice(evt) } onInput={ (evt) => this.setPlanPrice(evt) } discrete step={0.50} min={ plan.min_price_cents / 100 } max={ plan.max_price_cents / 100}  />
      </div>
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
            We're looking to refine our pricing structure over time. Currently
            we've activated the following plans:
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
      </div>
    );
  }
}

export {
  PricingPage,
}
