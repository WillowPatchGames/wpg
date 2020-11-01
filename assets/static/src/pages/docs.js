import React from 'react';

import {
  Link,
} from "react-router-dom";

import '@rmwc/grid/styles';
import '@rmwc/typography/styles';

import * as g from '@rmwc/grid';
import { Typography } from '@rmwc/typography';

class DocsPage extends React.Component {
  render() {
    return (
      <div className="App-page">
        <g.Grid fixedColumnWidth={ true }>
          <g.GridCell align="left" span={3} tablet={8} />
          <g.GridCell align="middle" span={6} tablet={8}>
            <article className="text">
              <Typography use="headline2">Documentation</Typography>
              <p>
                Hope it helps! Let us know if there's anything we can improve!<br /><br />
              Looking for rules? <Link to="/rules/rush">Check here instead!</Link>
              </p>
              <Typography use="headline3">Game Mechanics</Typography>
              <Typography use="headline4">Playing Tiles</Typography>
              <p>
                In order to make words, you need to be able to play tiles in a
                row. Here are a few ways of doing that:
              </p>
              <Typography use="headline5">Desktop</Typography>
              <ul>
                <li>
                  Click an empty space and press a letter key on your keyboard.
                  This will move the tile from your bank onto the board.
                </li>
                <li>
                  Alternatively, use your mouse to click and drag the tile from
                  your bank onto the board.
                </li>
              </ul>
              <Typography use="headline5">Touch Screen (Phone, Tablet, Laptop)</Typography>
              <ul>
                <li>
                  Tap a tile and click any empty square to place the tile there.
                </li>
                <li>
                  Tap an empty square and then tap the tile you wish to place there.
                </li>
                <li>
                  Or, drag and drop a tile from the bank onto the board.
                </li>
              </ul>
              <Typography use="headline4">Moving Tiles</Typography>
              <p>
                You can move tiles around if you don't like where you put them
                originally. You can also swap the positions of two tiles this way.
              </p>
              <Typography use="headline5">Desktop</Typography>
              <ul>
                <li>
                  Click on a letter tile and the place you'd like to put it.
                </li>
                <li>
                  Alternatively, use your mouse to click and drag the tile
                  to a new place on the board.
                </li>
              </ul>
              <Typography use="headline5">Touch Screen (Phone, Tablet, Laptop)</Typography>
              <ul>
                <li>
                  Tap a tile and tap the square you'd like to place it.
                </li>
                <li>
                  Tap an empty square and then tap the tile you wish to place there.
                </li>
                <li>
                  Or, drag and drop a tile from the bank onto the board.
                </li>
              </ul>
              <Typography use="headline4">Recalling Tiles</Typography>
              <p>
                If you wish to withdraw a tile back into your hand, you may
                do so. However, in order to draw more tiles, all tiles in your
                hand must form valid words on the board.
              </p>
              <Typography use="headline5">Desktop</Typography>
              <ul>
                <li>
                  You can click any tile and press the “recall” button to put
                  it back in your hand.
                </li>
                <li>
                  Alternatively, you can drag any tile into an empty space in
                  your hand or onto the “recall” button.
                </li>
              </ul>
              <Typography use="headline5">Touch Screen (Phone, Tablet, Laptop)</Typography>
              <ul>
                <li>
                  Tap a tile and press the “recall” button.
                </li>
                <li>
                  Drag a tile from into any empty space in your hand or onto
                  the recall button.
                </li>
              </ul>
              <Typography use="headline4">Discarding Tiles</Typography>
              <p>
                If you don't like a tile, you're free to discard it and try
                your luck for some new ones. The mechanics work just like
                recalling a tile. However, there's a penalty! You typically
                get more tiles back than what you discard.
              </p>
              <Typography use="headline4">Drawing or Going Out</Typography>
              <p>
                Once all your tiles are on the board and spell valid words, you
                can press the draw button to give a new tile. When not enough
                tiles are left, the first person to draw is the winner!
              </p>
            </article>
          </g.GridCell>
        </g.Grid>
      </div>
    );
  }
}

export { DocsPage };
