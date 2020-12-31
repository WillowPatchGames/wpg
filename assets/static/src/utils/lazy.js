import React from 'react';

import { CircularProgress } from '@rmwc/circular-progress';
import '@rmwc/circular-progress/styles';

class Lazy extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
    var resolved;
    props.data.then(data => {
      resolved = data;
      if (!this.state.loading) return;
      this.setState(state => Object.assign(state, { data, loading: false }));
    });
    if (resolved) {
      this.state.data = resolved;
    } else {
      this.state.loading = true;
    }
  }
  render() {
    if (this.state.loading) return <CircularProgress size="xlarge"/>;
    return this.props.render(this.state.data);
  }
}

export {
  Lazy
};
