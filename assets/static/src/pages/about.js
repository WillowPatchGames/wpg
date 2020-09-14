import React from 'react';

import '@rmwc/card/styles';
import '@rmwc/grid/styles';
import '@rmwc/typography/styles';

import * as c from '@rmwc/card';
import * as g from '@rmwc/grid';
import { Typography } from '@rmwc/typography';

import willows from '../images/WillowPatch.jpg';
import alex_scheel from '../images/alex-scheel.jpg';
import nick_scheel from '../images/nick-scheel.png';
import liz_mayo from '../images/liz-mayo.jpg';

class AboutPage extends React.Component {
  render() {
    console.log(willows);

    return (
      <div className="App-page">
        <g.Grid fixedColumnWidth={ true }>
          <g.GridCell align="left" span={6}>
            <Typography use="headline2">About Willow Patch Games!</Typography>
            <c.Card>
              <article class="text" style={{ padding: '1rem 1rem 1rem 1rem' }}>
                <p>
                  This company was started one fun week in Ann Arbor, Michigan. Two
                  brothers, Nick and Alex, got together and put together the core of
                  the game. That weekend, we all got together and play-tested it for
                  the first time. With a bit of polish, we decided to launch and share
                  our game with anyone who'd like to play.
                </p>
                <p>
                  Our goal is to create a sustainable company. We think playing games
                  with friends is a fun social activity. However, in these recent times,
                  we've not been able to get together with ours as much as we'd like.
                  We're hoping that this will fill a void with your own family and friends,
                  and that you'd help us grow and expand to new games. Please have fun
                  sharing it with your friends and family!
                </p>
              </article>
            </c.Card>
          </g.GridCell>
          <g.GridCell align="right" span={6}>
            <c.Card>
              <c.CardMedia sixteenByNine style={{ backgroundImage: 'url(' + willows + ')' }} />
              <article class="text" style={{ padding: '0 1rem 1rem 1rem' }}>
                <Typography use="headline3">About the Name</Typography>
                <p>
                  On a lake somewhere in Idaho, there's a patch of willows growing by
                  the side of a dirt boat launch. Moose and fox wander around these
                  willows, giving many visitors a story to tell. We've always loved
                  hearing these stories and hope our social games inspire you to tell
                  your own stories.
                </p>
              </article>
            </c.Card>
          </g.GridCell>
        </g.Grid>
        <Typography use="headline2">Our Team!</Typography>
        <div className="flexbox App-1000px">
          <div className="flexible">
            <c.Card>
              <c.CardMedia square style={{ backgroundImage: 'url(' + alex_scheel + ')' }} />
              <article class="text" style={{ padding: '0 1rem 1rem 1rem' }}>
                <Typography use="headline3">Alex Scheel</Typography>
                <p>
                  Alex is one of the two cofounders.
                </p>
              </article>
            </c.Card>
          </div>
          <div className="flexible">
            <c.Card>
              <c.CardMedia square style={{ backgroundImage: 'url(' + nick_scheel + ')' }} />
              <article class="text" style={{ padding: '0 1rem 1rem 1rem' }}>
                <Typography use="headline3">Nick Scheel</Typography>
                <p>
                  Nick is one of the two cofounders.
                </p>
              </article>
            </c.Card>
          </div>
          <div className="flexible">
            <c.Card>
              <c.CardMedia square style={{ backgroundImage: 'url(' + liz_mayo + ')' }} />
              <article class="text" style={{ padding: '0 1rem 1rem 1rem' }}>
                <Typography use="headline3">Liz Mayo</Typography>
                <p>
                  Liz is our graphic design intern.
                </p>
              </article>
            </c.Card>
          </div>
        </div>
      </div>
    );
  }
}

export { AboutPage };
