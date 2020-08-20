import React from 'react';

import '../App.css';

class Footer extends React.Component {
  render() {
    if (this.props.state !== 'play') {
      return (
        <div className="App-footer">
          <p style={{ fontSize: '0.85em' }} >
            Copyright (C) WordCorp<br />
            All Rights Reserved.<br />
          </p>
        </div>
      )
    }
  }
}

export { Footer };
