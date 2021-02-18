import React from 'react';

import { LazyLoadComponent, LazyLoadImage } from 'react-lazy-load-image-component';

import * as g from '@rmwc/grid';
import '@rmwc/grid/styles';
import { Typography } from '@rmwc/typography';
import '@rmwc/typography/styles';
import { Theme } from '@rmwc/theme';
import '@rmwc/theme/styles';

import '../App.css';

import logo from '../images/logo.png';
import WinnerGif from '../images/Home-Page-small.gif';
import WinnerWebM from '../images/Home-Page-large.webm';
import WinnerMP4 from '../images/Home-Page-large.mp4';

class HomePage extends React.Component {
  render() {
    return (
      <div className="App-hero App-page">
        <div className="App-1000px">
          <Theme use={ 'onPrimary' } >
            <g.GridRow>
              <g.GridCell align="middle" span={4} tablet={8} phone={4}>
                <LazyLoadImage className="App-Logo" src={ logo } alt="" />
              </g.GridCell>
              <g.GridCell align="right" span={8} tablet={8}>
                <div className="styles.intro">
                  <div>
                    <Typography use="headline2" style={{ 'color': '#008006',
                    'lineHeight': '75%' }}>
                      Welcome <br/ >
                      <span style={{ 'fontSize': '60%' }}>to</span><br/ >
                      <strong style={{ 'color': '#000000' }}>Willow Patch Games</strong>!
                    </Typography>
                  </div>
                  <div>
                    <Typography use="headline4" style={{ textAlign: 'left' }}>
                      Redefining table-top games...
                    </Typography>
                    <Typography use="headline4" style={{ textAlign: 'right' }}>
                      ...and updating them for the<br />21st century
                    </Typography>

                  </div>
                </div>
              </g.GridCell>
            </g.GridRow>
            <g.GridRow>
              <g.GridCell align="middle" span={4} tablet={8} phone={4}>
                { null }
              </g.GridCell>
              <g.GridCell align="right" span={8}>
                <div>
                  <LazyLoadComponent>
                    <video className="App-gifs" autoPlay={ true } loop={ true } muted={ true } playsInline={ true }>
                      <source src={ WinnerWebM } type="video/webm" />
                      <source src={ WinnerMP4 } type="video/mp4" />
                      <LazyLoadImage src={ WinnerGif } alt="Animated screenshot of game play" />
                    </video>
                  </LazyLoadComponent>

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
