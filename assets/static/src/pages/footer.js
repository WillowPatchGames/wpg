import React from 'react';

import '../App.css';

class Footer extends React.Component {
  render() {
    if (this.props.state !== 'play') {
      return (
        <div className="App-footer">
          <p style={{ fontSize: '0.85em' }} >
            <a href="#about">About Us</a> | <a href="#rush-rules">Rush! Rules</a> | <a href="#docs">Documentation</a>
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
