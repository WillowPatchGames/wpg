import React from 'react';

import '@rmwc/card/styles';
import '@rmwc/list/styles';
import '@rmwc/slider/styles';
import '@rmwc/typography/styles';

import * as c from '@rmwc/card';
import * as l from '@rmwc/list';
import { Slider } from '@rmwc/slider';
import { Typography } from '@rmwc/typography';

import { PlanModel } from '../models.js';

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

  centsToDollar(value) {
    var dollars = parseInt(value / 100);
    var cents = "" + (value % 100) + "";
    if (cents.length === 1) {
      cents = cents + "0";
    }
    return '$' + dollars + "." + cents;
  }

  render() {
    var active_plans = [];
    if (this.state.plans) {
      for (let plan of this.state.plans) {
        active_plans.push(
          <div className="flexible" style={{ margin: "1rem" }}>
            <c.Card style={{ 'width': '400px' }}>
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

                {
                  plan.open && plan.min_price_cents >= 0 && plan.max_price_cents >= 0
                  ? <div className="text-left">
                      <i>Suggested price:</i>: <b>{ this.centsToDollar(plan.suggested_price_cents) }</b>
                      <Slider value={ plan.suggested_price_cents / 100 } onChange={ (evt) => this.setPlanPrice(plan, evt) } onInput={ (evt) => this.setPlanPrice(plan, evt) } discrete step={0.50} min={ plan.min_price_cents / 100 } max={ plan.max_price_cents / 100}  />
                    </div>
                  : null
                }
              </div>
              {
                plan.open
                ?
                  <c.CardActions>
                    <c.CardActionButton>Buy</c.CardActionButton>
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

class PricingPage extends React.Component {
  render() {
    return (
      <div className="App-page">
        <div>
          <Typography use="headline2">Pricing Information</Typography>
          <Typography use="body">
            We're looking to refine our pricing structure over time. Currently
            we've activated the following plans:
          </Typography>
        </div>
        <div className="flexbox">
          <ActivePricingPage {...this.props} />
        </div>
      </div>
    );
  }
}

export {
  PricingPage,
}
