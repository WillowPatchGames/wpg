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
              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse auctor vel lacus et volutpat. Nulla ullamcorper, leo ac egestas ullamcorper, erat neque efficitur libero, sed pretium velit eros luctus leo. Fusce ullamcorper tristique elit, ut gravida tortor vestibulum blandit. Curabitur egestas sagittis feugiat. Nam vitae lorem at lorem consectetur cursus. Mauris ipsum erat, dapibus eget finibus ut, eleifend non sem. Vivamus malesuada sit amet ex in egestas.</p>
            </article>
          </g.GridCell>
        </g.Grid>
      </div>
    );
  }
}

export { AboutPage };
