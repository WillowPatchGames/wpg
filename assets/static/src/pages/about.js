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
    return (
      <div className="App-page">
        <g.Grid fixedColumnWidth={ true }>
          <g.GridCell align="left" span={6}>
            <Typography use="headline2">About Willow Patch Games!</Typography>
            <c.Card>
              <article className="text" style={{ padding: '1rem 1rem 1rem 1rem' }}>
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
              <article className="text" style={{ padding: '0 1rem 1rem 1rem' }}>
                <Typography use="headline3">About the Name</Typography>
                <p>
                  On a lake somewhere in Idaho, there's a patch of willows growing by
                  the side of a dirt boat launch. Moose and fox wander around these
                  willows, giving many visitors a story to tell. We've always loved
                  hearing these stories and hope our social games inspire you to tell
                  your own stories.
                </p>
                <p>
                  The artwork above was created by our talented designer, Liz Mayo,
                  and was inspired by the actual lake.
                </p>
              </article>
            </c.Card>
          </g.GridCell>
        </g.Grid>
        <Typography use="headline2">Meet Our Team!</Typography>
        <div className="flexbox App-1000px">
          <div className="flexible">
            <c.Card style={{ width: '300px' }}>
              <c.CardMedia square style={{ backgroundImage: 'url(' + alex_scheel + ')' }} />
              <Typography use="headline3">Alex&nbsp;Scheel</Typography>
              <article className="text-left" style={{ padding: '0 1rem 1rem 1rem' }}>
                <p>
                  Alex is one of the two cofounders of <i>Willow Patch Games</i> with
                  his brother Nick. He is an engineer at Red Hat working on the Red Hat
                  Certificate System product. When not working, often you'll find him
                  playing violin or taking photos.
                </p>
              </article>
              <c.CardActions>
                <c.CardActionIcons>
                  {
                    // eslint-disable-next-line
                    <a href="https://cipherboy.com" target="_blank" rel="noopener"><c.CardActionIcon icon="home" /></a>
                  }
                  {
                    // eslint-disable-next-line
                    <a href="https://g.cipherboy.com" target="_blank" rel="noopener"><c.CardActionIcon icon="person" /></a>
                  }
                </c.CardActionIcons>
              </c.CardActions>
            </c.Card>
          </div>
          <div className="flexible">
            <c.Card style={{ width: '300px' }}>
              <c.CardMedia square style={{ backgroundImage: 'url(' + nick_scheel + ')' }} />
              <Typography use="headline3">Nick&nbsp;Scheel</Typography>
              <article className="text-left" style={{ padding: '0 1rem 1rem 1rem' }}>
                <p>
                  Nick is one of the two cofounders of <i>Willow Patch Games</i> with
                  his brother Alex. Nick is pursuing dual degrees in Cello Performance
                  and Mathematics at <a href="https://www.bard.edu/" target="_blank" rel="noopener noreferrer">Bard</a> in
                  New York.
                </p>
              </article>
              <c.CardActions>
                <c.CardActionIcons>
                  <a href="https://github.com/MonoidMusician" target="_blank" rel="noopener noreferrer"><c.CardActionIcon icon="person" /></a>
                </c.CardActionIcons>
              </c.CardActions>
            </c.Card>
          </div>
          <div className="flexible">
            <c.Card style={{ width: '300px' }}>
              <c.CardMedia square style={{ backgroundImage: 'url(' + liz_mayo + ')' }} />
              <Typography use="headline3">Liz&nbsp;Mayo</Typography>
              <article className="text-left" style={{ padding: '0 1rem 1rem 1rem' }}>
                <p>
                  Liz is our marketing and graphic design intern. She is currently pursuing
                  a marketing degree at <a href="https://wmich.edu/" target="_blank" rel="noopener noreferrer">WMU</a>.
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
