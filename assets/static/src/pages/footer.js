import React from 'react';

import '../App.css';

class Footer extends React.Component {
  render() {
    if (this.props.state !== 'play') {
      return (
        <div className="App-footer">
          <p style={{ fontSize: '0.85em' }} >
            <a href="#about">About Us</a> | <a href="#privacy">Privacy Policy</a> | <a href="#rush-rules">Rush! Rules</a> | <a href="#docs">Documentation</a> | <a href="#pricing">Pricing</a>
          </p>
          <p style={{ fontSize: '0.85em' }} >
            Questions or comments? <a href="mailto:willowpatchgames@gmail.com">Email us</a> or <a href="https://twitter.com/willowpatchgame">tweet us</a>.
          </p>
          <p style={{ fontSize: '0.85em' }} >
            Copyright (C) Willow Patch Games<br />
            All Rights Reserved.<br />
          </p>
        </div>
      )
    }
  }
}

export { Footer };
