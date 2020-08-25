import React from 'react';

import '@rmwc/grid/styles';
import '@rmwc/typography/styles';

import * as g from '@rmwc/grid';
import { Typography } from '@rmwc/typography';

class AboutPage extends React.Component {
  render() {
    return (
      <div className="App-page">
        <g.Grid fixedColumnWidth={ true }>
          <g.GridCell align="left" span={3} />
          <g.GridCell align="middle" span={6}>
            <article>
              <Typography use="headline2">About Willow Patch Games!</Typography>
              <p>
                This company was started one fun week in Ann Arbor, Michigan. Two
                brothers, Nick and Alex, got together and put together the core of
                the game. That weekend, we all got together and play-tested it for
                the first time. With a bit of polish, we decided to launch and share
                our game with anyone who’d like to play.
              </p>
              <p>
                Our goal is to create a sustainable company. We think playing games
                with friends is a fun social activity. However, in these recent times,
                we’ve not been able to get together with ours as much as we’d like.
                We’re hoping that this will fill a void with your own family and friends,
                and that you’d help us grow and expand to new games. Please have fun
                sharing it with your friends and family!
              </p>
              <Typography use="headline3">About the Name</Typography>
              <p>
                On a lake somewhere in Idaho, there’s a patch of willows growing by
                the side of a dirt boat launch. Moose and fox wander around these
                willows, giving many visitors a story to tell. We’ve always loved
                hearing these stories and hope our social games inspire you to tell
                your own stories.
              </p>
            </article>
          </g.GridCell>
        </g.Grid>
      </div>
    );
  }
}

export { AboutPage };
