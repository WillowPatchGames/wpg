import React from 'react';

import {
  Link,
} from "react-router-dom";

import '../App.css';

import * as c from '@rmwc/card';
import '@rmwc/card/styles';
import { Typography } from '@rmwc/typography';
import '@rmwc/typography/styles';

import { Card, CardHand } from '../games/card.js';

class LoadingPage extends React.Component {
  render() {
    return (
      <p>
        Please wait while this page loads. If this page doesn't
        load, <Link to="/">click here</Link> to go back to the home page.
      </p>
    );
  }
}

class ErrorPage extends React.Component {
  render() {
    return "Sorry, an unknown error occurred.";
  }
}

class NotFoundPage extends React.Component {
  render() {
    var cards = [];
    for (var i = 0; i < 2; i++) {
      for (let suit of ['1', '2', '3', '4']) {
        for (let rank of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13']) {
          let card = Card.deserialize({'suit': suit, 'rank': rank});
          cards.push(card);
        }
      }
    }
    var hand = new CardHand(cards);

    return (
      <div>
        <div style={{ width: "80%" , margin: "1em auto 1em auto" }}>
          <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
            <div style={{ padding: "1rem 1rem 1rem 1rem" }}>
              <Typography use="headline2">
                Sorry! We couldn't find that page!
              </Typography>
              <p>
                <Link to="/">Click here</Link> to go back to the home page.
              </p>
            </div>
          </c.Card>
        </div>
        <div style={{ width: "80%" , margin: "1em auto 1em auto" }}>
          <c.Card style={{ width: "100%" , padding: "0.5em 0.5em 0.5em 0.5em" }}>
            <div style={{ padding: "1rem 1rem 1rem 1rem", minHeight: "min(550px, 50vh)" }}>
              { hand.toImage(null, { scale: 0.4, overlap: 0.97, curve: 4 }) }
            </div>
          </c.Card>
        </div>
      </div>
    );
  }
}

export { LoadingPage, NotFoundPage, ErrorPage };
