import React from 'react';

import { Button } from '@rmwc/button';
import '@rmwc/button/styles';
import { CircularProgress } from '@rmwc/circular-progress';
import '@rmwc/circular-progress/styles';

class CancellableButton extends React.Component {
  constructor(props) {
    super(props);

    // Expecting:
    // submitHandler
    // cancelHandler
    // label?
    // icon?

    this.state = {
      loading: false,
      seenIsLoading: false,
      hovering: false,
    };
  }

  static getDerivedStateFromProps(props, state) {
    if (state.loading) {
      if (state.seenIsLoading && !props.isLoading) {
        return Object.assign({}, state, { loading: false });
      } else if (!state.seenIsLoading && props.isLoading) {
        return Object.assign({}, state, { seenIsLoading: true });
      }
    } else {
      Object.assign({}, state, { seenIsLoading: false })
    }
  }

  clickHandler() {
    if (this.props.disabled) {
      return;
    }

    if (this.state.loading) {
      this.props.cancelHandler();
    } else {
      this.props.submitHandler();
    }

    this.setState(state => Object.assign({}, state, { loading: !state.loading, hovering: false }));
  }

  render() {
    let loading = this.state.loading;
    let label = this.props?.label;
    if (loading) {
      if (!this.state.hovering) {
        label = this.props?.loadingLabel || ("Cancel " + label);
      } else {
        label = this.props?.cancelLabel || ("Cancel " + label);
      }
    }

    let icon = this.props?.icon;
    if (loading) {
      if (!this.state.hovering) {
        icon = <CircularProgress theme="secondary" />;
      } else {
        icon = "cancel";
      }
    }

    return (
      <Button
        label={ label }
        icon={ icon }
        raised={ this.props?.raised }
        style={ this.props?.style }
        disabled={ this.props?.disabled }
        onMouseEnter={ (e) => { e.preventDefault() ; this.setState(state => Object.assign({}, state, { hovering: true })) } }
        onMouseLeave={ (e) => { e.preventDefault() ; this.setState(state => Object.assign({}, state, { hovering: false })) } }
        onClick={ (e) => { e.currentTarget.blur() ; e.preventDefault() ; this.clickHandler() } }
      />
    );
  }
}

export {
  CancellableButton
};
