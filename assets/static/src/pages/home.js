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
                  Redefining table-top games updating them for the 21st century.
                </Typography>
              </div>
              <p>
                Hey there! We're a small game company kick-started by two brothers
                one week in August. We like to build games you can play with your
                friends or family, while catching up and chatting. If this sounds
                like something cool, we'd love to show you around!
              </p>
            </div>
          </Theme>
        </ThemeProvider>
      </div>
    );
  }
}

export { HomePage };
