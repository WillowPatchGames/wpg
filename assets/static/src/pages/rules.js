import React from 'react';

import {
  Link,
} from "react-router-dom";

import '@rmwc/grid/styles';
import '@rmwc/typography/styles';

import * as g from '@rmwc/grid';
import { Typography } from '@rmwc/typography';

import GameStartsScreen from '../images/Screenshots/Game starts screen 1.png';
import YouDrewMessage from '../images/Screenshots/you drew message.png';
import Discard from '../images/Screenshots/Discard ANN.png';
import Winner from '../images/Screenshots/winning message.png';

class RushRulesPage extends React.Component {
  render() {
    return (
      <div className="App-page">
        <g.Grid fixedColumnWidth={ true }>
          <g.GridCell align="left" span={3} tablet={8} />
          <g.GridCell align="middle" span={6} tablet={8}>
            <article className="text">
              <Typography use="headline2">Quick Start Guide - Rush!</Typography>
              <p>
                The host creates a room and selects desired customizations.
                Customization options include changing the total number of
                tiles, how many tiles players start with, the number of tiles
                to draw, and the discard penalty. For information on hosting,
                go <Link to="/docs#host">here</Link>.
              </p>
              <p>
                Game play starts with everyone receiving the number of initial
                tiles set by the host. The objective of the game is to place
                all your tiles on the board in a single, connected word grid
                list.
              </p>
              <img className= "App-screenshots" src={GameStartsScreen} sizes= "180x180" alt="Tiles populated on grid" />

              <p>
                When a player uses up all the tiles in their bank, they click
                the draw button.Then every player automatically draws and is
                given additional number of tiles specified by the game
                configuration, from the pile. The first person to place all
                their tiles on the board (when there are no more in the pile!)
                is "out" and wins the game.
              </p>
              <img className= "App-screenshots" src={YouDrewMessage} sizes= "180x180" alt="You drew message shown." />

              <p>
                You can play a tile on a desktop computer by clicking the
                square it should go in and pressing a letter on the keyboard,
                or by clicking the tile and then clicking the square it should
                go in (or visa versa).
              </p>
              <p>
                On a phone or tablet, you can drag and drop a tile into a
                square, or you can tap the letter and then tap the square it
                should go into (or vise versa).
              </p>
              <p>
                If you don't like a tile, drag it onto the "discard" button;
                you'll be given a couple of tiles (specified as the discard
                penalty)  as replacement. This is configurable and is usually
                three.
              </p>
              <img className= "App-screenshots" src={Discard} sizes= "180x180" alt="Discard a tile to get different tiles" />

              <p>
               If there aren't enough tiles left for everyone to draw, someone
               is the winner!
              </p>
              <img className= "App-screenshots" src={Winner} sizes= "180x180" alt="Winner board is displayed." />

              <p>
                We suggest roughly 35 tiles per player, 15 tiles to start, a
                discard penalty of 3, and 1 for the draw amount. One round
                will usually take a couple of minutes. I bet you can't play
                just one. :-)
              </p>
            </article>
          </g.GridCell>
        </g.Grid>
      </div>
    );
  }
}

export { RushRulesPage };
