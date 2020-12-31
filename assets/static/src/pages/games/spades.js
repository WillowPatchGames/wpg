import React from 'react';
import shallowEqual from 'shallow-eq';
import mergeProps from 'react-merge-props';

import '../../main.scss';

import { gravatarify } from '../../utils/gravatar.js';

import { Avatar } from '@rmwc/avatar';
import '@rmwc/avatar/styles';
import { Button } from '@rmwc/button';
import '@rmwc/button/styles';
import { Select } from '@rmwc/select';
import '@rmwc/select/styles';
import { CircularProgress } from '@rmwc/circular-progress';
import '@rmwc/circular-progress/styles';

import { CardImage, CardHand } from '../../games/card.js';


class Lazy extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
    var resolved;
    props.data.then(data => {
      resolved = data;
      if (!this.state.loading) return;
      this.setState(state => Object.assign(state, { data, loading: false }));
    });
    if (resolved) {
      this.state.data = resolved;
    } else {
      this.state.loading = true;
    }
  }
  render() {
    if (this.state.loading) return <CircularProgress size="xlarge"/>;
    return this.props.render(this.state.data);
  }
}

var synopsis_columns = {
  "user":{
    name: "User",
    printer: user => <Lazy data={ user } render={ user => <Avatar src={ gravatarify(user) } name={ user.display } size="xlarge" /> }/>,
  },
  "is_turn":{
    name: "Turn",
    printer: a => a ? "•" : "",
  },
  "is_leader":{
    name: "Leading",
    printer: a => a ? "•" : "",
  },
  "is_dealer":{
    name: "Dealing",
    printer: a => a ? "•" : "",
  },
  "bid":"Bid",
  "tricks":"Tricks taken",
  "score":"Score",
  "overtakes":"Overtakes",
}

var tabulate = columns => data => {
  if (!data) return <></>;
  var rows = [[]];
  for (let k in columns) {
    var name = columns[k];
    if (typeof name === "object") name = name.name;
    rows[0].push(<th key={ k }>{ name }</th>);
  }
  for (let dat of data) {
    rows.push([]);
    for (let k in columns) {
      var printer = a => a;
      if (typeof columns[k] === "object") var printer = columns[k].printer;
      rows[rows.length-1].push(<td key={ k }>{ printer(dat[k]) }</td>)
    }
  }
  return <table><tbody>{rows.map((row,i) => <tr key={ i }>{row}</tr>)}</tbody></table>;
};

class SpadesGameComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.state.game = props.game;
    this.state.selected = null;
    this.state.bid = null;
    // FIXME: hack?
    this.state.game.interface.onChange = () => {
      this.setState(state => {
        // Jinx
        return state;
      });
    };
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
  render() {
    var status = a => a;
    var player_info = tabulate(synopsis_columns)(this.state.game.interface.synopsis.players);
    if (!this.state.game.interface.started) {
      return status("Waiting for game to start …");
    } else if (this.state.game.interface.finished) {
      return <div>
        {status("Finished")}
        {player_info}
      </div>;
    } else if (!this.state.game.interface.dealt) {
      if (this.state.game.interface.my_turn()) {
        if (!this.state.game.interface.data.drawn) {
          return <div>
            <Button label="Draw!" unelevated ripple={false} onClick={() => this.state.game.interface.deal()} />
            { this.state.game.interface.data.hand?.toImage() }
          </div>
        } else {
          return <div>
            {status("You got this card:")}
            { this.state.game.interface.data.drawn?.toImage() }
            <Button label="Keep" unelevated ripple={false} onClick={() => this.state.game.interface.decide(true)} />
            <Button label="Take other card" unelevated ripple={false} onClick={() => this.state.game.interface.decide(false)} />
            { this.state.game.interface.data.hand?.toImage() }
          </div>;
        }
      } else {
        return <div>
          { status("Waiting for other player to draw …") }
          { this.state.game.interface.data.hand?.toImage() }
        </div>;
      }
    } else if (!this.state.game.interface.bidded) {
      if (this.state.game.interface.my_turn()) {
        return <div>
          {player_info}
          {status("Please place your bid:")}
          <Select label="Bid value" options={ this.state.game.interface.valid_bids() }
            onChange={ e => {let bid = e.currentTarget.value; this.setState(state => Object.assign(state, {bid}))}
          }/>
          <Button label="Place bid" unelevated ripple={false} onClick={() => this.state.game.interface.bid(this.state.bid)} />
          {
            this.state.game.interface.data.peeked
            ? this.state.game.interface.data.hand?.toImage()
            : <Button label="Peek at cards" unelevated ripple={false} onClick={() => this.state.game.interface.peek()} />
          }
        </div>;
      } else {
        return <div>
          {player_info}
          {status("Waiting for bids …")}
          { this.state.game.interface.data.hand?.toImage() }
        </div>;
      }
    } else {
      if (this.state.game.interface.my_turn()) {
        return <div>
          {player_info}
          {status(this.state.game.interface.data.played.cards.length ? "Already played" : "You lead")}
          { this.state.game.interface.data.played?.toImage() }
          {status("Choose a card")}
          { this.state.game.interface.data.hand?.toImage(this.selecting.bind(this)) }
          <Button label="Play this card" unelevated ripple={false} disabled={ !this.state.selected }
            onClick={ () => this.state.game.interface.play(this.state.selected) } />
        </div>;
      } else {
        return <div>
          {player_info}
          { this.state.game.interface.data.played?.toImage() }
          {status("Waiting for other player to play …")}
          { this.state.game.interface.data.hand?.toImage() }
        </div>;
      }
    }
  }
}

export {
  SpadesGameComponent,
}
