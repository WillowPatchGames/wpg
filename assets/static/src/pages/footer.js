import React from 'react';

import { Link } from "react-router-dom";

import '../App.css';
import '../main.scss';

class Footer extends React.Component {
  render() {
    if (this.props.state !== 'play') {
      return (
        <div className="App-footer">
          <p style={{ fontSize: '0.85em' }} >
            <Link to="/about">About Us</Link> | <a href="https://blog.willowpatchgames.com">Blog</a> | <Link to="/privacy">Privacy Policy</Link> | <Link to="/rules/rush">Rush! Rules</Link> | <Link to="/docs">Documentation</Link> | <Link to="/pricing">Pricing</Link>
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
