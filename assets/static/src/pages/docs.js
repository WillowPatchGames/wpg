import React from 'react';

import {
  Link,
} from "react-router-dom";

import * as g from '@rmwc/grid';
import '@rmwc/grid/styles';
import { Typography } from '@rmwc/typography';
import '@rmwc/typography/styles';

import '../App.css';

/* change name GameStartsScreen */
import ShareSecretCode from '../images/Screenshots/ShareSecretCode.png';
import JoinasGuest from '../images/Screenshots/JoinasGuest.png';
import JoinExisting from '../images/Screenshots/JoinExisting.png';
import CreateGames from '../images/Screenshots/CreateGames.png';
import CreateGamePlayer from '../images/Screenshots/CreateGamePlayer.png';
import CreateGameGameOptions from '../images/Screenshots/CreateGameGameOptions.png';
import CreateGameTiles from '../images/Screenshots/CreateGameTiles.png';
import AdmitPlayer from '../images/Screenshots/AdmitPlayer.png';
import Winnergif from '../images/Home-Page-small.gif';


class DocsPage extends React.Component {
  render() {
    return (
      <div className="App-page">
        <g.Grid fixedColumnWidth={ true }>
          <g.GridCell align="left" span={3} tablet={8} />
          <g.GridCell align="middle" span={6} tablet={8}>
            <article className="text">
              <Typography use="headline2">Game Play Details</Typography>
              <p>
                Hope it helps! Let us know if there's anything we can improve!<br />
                <br /> Looking for quick rules? <Link to="/rules/rush">Check here
                instead!</Link>
              </p>

              <p> You can play Rush! in a game or a room.  The host decides if
              the party will be playing one game or a series of games in a room.
              </p>

              <Typography use="headline5">Need to know how to &nbsp;

              <a href ="#host">host</a> ?</Typography>
              <br />
              <br />
              <Typography use="headline3" id="player">How to Play Rush!</Typography>
              <p> You can play as a guest or as a signed in player.

              </p>
              <p>
               For a guest player just enter your screen name and click play as guest button.
               <br />
               <br />
               </p>
               <img className= "App-screenshots" src={JoinasGuest} sizes= "180x180" alt="Join As Guest" />
              <p> To login, follow the screen prompts to login in and play.
              </p>

              <p>
                If you don't have an account, you can click the signup button
                at the top of the page.
              </p>

              <p>
                Next, place your secret passcode given to you by the host in
                the Join an Existing Room or Game box. Click the blue "Join"
                button.
                <br />
                <br />
                </p>
                <img className= "App-screenshots" src={JoinExisting} sizes= "180x180" alt="Join Existing Game" />
              <p>
                You are now admitted to the game or room.  If you're playing
                a in a room you will see your name along with other guests.
                Note: Your host can admit you as a player or
                as a spectator.  A spectator doesn't play but watches what's
                happening in the room.
              </p>

              <p>
                Get ready!  The countdown will begin once all players have been
                admitted to the room. All players will see a board and letter
                tiles pop-up on the screen.  Start placing tiles to form words.
                <b> Follow instructions in Playing Tiles on how to do that on
                your device. </b>
                <br />
                <br />
                </p>
                <img className= "App-screenshots" src={Winnergif} sizes= "180x180" alt="Games Starts" />
              <p>
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
              <Typography use="headline3" id="host">How to Host a Rush!</Typography>
              <p> To Host a Rush! Game,  first signup for an account or login if you
               already have an account.
              </p>
              <p> The following screen is displayed to make selections for the game.
              </p>
              <img className= "App-screenshots" src={CreateGames} sizes= "180x180"
              alt="Join Existing Game" />
              <p> Player Options:</p>
              <ul>
                <li>Open for anyone to join or those invited (default is open)
                </li>
                <li>Allow Spectators - players can watch the boards instead of
                playing. (default is allow)
                </li>
                <li>Set the number of players.
                </li>
              </ul>
              <img className= "App-screenshots" src={CreateGamePlayer} sizes= "180x180"
              alt="Game Player Options" />
              <p>Game Options:</p>
              <ul>
                <li> Game Mode is set to Rush! (Fast Paced Game)
                </li>
                <li> Set the number of tiles (default is 75)
                </li>
                <li> Decide if the number of tiles is for each player or for the
                game.
                </li>
              </ul>
              <img className= "App-screenshots" src={CreateGameGameOptions} sizes= "180x180" alt="Game Options" />
              <p>Tile options:</p>
              <ul>
                <li> Tile Frequency options are:
                </li>
                  <ul>
                    <li> Standard US English Letter Frequencies
                    </li>
                    <li> Bananagrams Tile Frequency
                    </li>
                    <li>Scrabble Tile Frequency
                    </li>
                  </ul>
                <li> Player Tile Start Size - number of tiles to start the game.
                </li>
                <li> Player Tile Draw Size - number of tiles to draw.
                </li>
                <li> Player Tile Discard Penalty - number of tiles drawn when 1
                tile is discarded.
                </li>
              </ul>
              <img className= "App-screenshots" src={CreateGameTiles} sizes= "180x180"
              alt="Game Tile Options" />
              <p> Share this secret code with your players.  Tip:  The rectangle
              on the left copies the secret code to the clipboard.
              <br />
              </p>
              <img className= "App-screenshots" src={ShareSecretCode} sizes= "180x180"
              alt="Share secret code" />
              <p>
              </p>
              <p> Once the players have their secret code and have entered it,
              your screen will automatically show players who have
              joined the game. Select the box to admit the player. Toggle
              to spectator if they are not playing. Finally, press the Start key and
              wait for the countdown to begin!   <b>Have Fun and Good Luck!</b>
              </p>
              <img className= "App-screenshots" src={AdmitPlayer} sizes= "180x180"
              alt="Admit Player" />
            </article>
          </g.GridCell>
        </g.Grid>
      </div>
    );
  }
}

export { DocsPage };
