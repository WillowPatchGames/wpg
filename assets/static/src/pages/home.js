import React from 'react';

import '../App.css';
import '@rmwc/typography/styles';
import '@rmwc/theme/styles';

import { Typography } from '@rmwc/typography';
import { Theme, ThemeProvider } from '@rmwc/theme';

class HomePage extends React.Component {
  render() {
    return (
      <div className="App-hero App-page">
        <ThemeProvider
          options={{
            surface: '#19718A',
            onSurface: '#06313D'
          }}
        >
          <Theme use={ 'onPrimary' } >
            <div className="styles.intro">
              <div>
                <Typography use="headline2">
                  Welcome to Willow Patch Games!
                </Typography>
              </div>
              <div>
                <Typography use="headline3">
                  Home of wonderful word games
                </Typography>
              </div>
              <p>
                Hi! I&apos;m Alex and he&apos;s Nick and we&apos;ve created a fun website to play games on.
                <br /><br />
                At least, we think it is fun.
              </p>
            </div>
          </Theme>
        </ThemeProvider>
      </div>
    );
  }
}

export { HomePage };
