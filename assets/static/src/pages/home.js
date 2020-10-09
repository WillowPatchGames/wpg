import React from 'react';

import '../App.css';
import '@rmwc/grid/styles';
import '@rmwc/typography/styles';
import '@rmwc/theme/styles';

import * as g from '@rmwc/grid';
import { Typography } from '@rmwc/typography';
import { Theme, ThemeProvider } from '@rmwc/theme';
import logo from '../images/logo.png';

class HomePage extends React.Component {
  render() {
    return (
      <div className="App-hero App-page">
        <div className="App-1000px">
          <Theme use={ 'onPrimary' } >
            <g.GridRow>
              <g.GridCell align="middle" span={3} tablet={8} phone={4}>
                <img id="wpg-logo" src={ logo } style={{ "max-width": "100%", "max-height": "25rem" }} />
              </g.GridCell>
              <g.GridCell align="right" span={9}>
                <div className="styles.intro">
                  <div>
                    <Typography use="headline2">
                      Welcome to Willow Patch Games!
                    </Typography>
                  </div>
                  <div>
                    <Typography use="headline3" style={{ textAlign: 'left' }}>
                      Redefining table-top games...
                    </Typography>
                    <Typography use="headline3" style={{ textAlign: 'right' }}>
                      ...and updating them for the<br />21st century
                    </Typography>
                  </div>
                  <p style={{ textAlign: 'left' }}>
                    Hey there! We're a small game company kick-started by two brothers
                    one week in August. We like to build games you can play with your
                    friends or family, while catching up and chatting. If this sounds
                    like something cool, we'd love to show you around!
                  </p>
                </div>
              </g.GridCell>
            </g.GridRow>
          </Theme>
        </div>
      </div>
    );
  }
}

export { HomePage };
