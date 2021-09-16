import React from 'react';

import { Tooltip } from '@rmwc/tooltip';
import '@rmwc/tooltip/styles';

import { killable } from './killable.js';

class TooltipWrapper extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      tooltip: false,
      timeout: killable(() => { this.autoHide() }, 5000),
    };
    this.time = 0;
  }
  autoHide() {
    this.setState(state => {
      state.tooltip = false;
      state.timeout.kill();
      return state;
    });
  }
  onClick() {
    if (Date.now() > this.time + 200) { // 20 was not enough lol
      this.setState(state => {
        state.tooltip = !state.tooltip;
        if (state.tooltip) {
          state.timeout.reset();
        } else {
          state.timeout.kill();
        }
        return state;
      });
    }
    this.time = Date.now();
  }
  onMouseEnter() {
    if (!this.state.tooltip) {
      this.setState(state => {
        state.tooltip = true;
        state.timeout.reset();
        return state;
      });
    }
    this.time = Date.now();
  }
  onMouseLeave() {
    if (this.state.tooltip) {
      this.setState(state => {
        state.tooltip = false;
        state.timeout.kill();
        return state;
      });
    }
    this.time = Date.now();
  }
  render() {
    let { content, align, ...props } = this.props;
    if (!align) align = "right";
    return <Tooltip align={ align } content={ content } open={ this.state.tooltip } activateOn={[]}>
      <div
        onClick={ this.onClick.bind(this) }
        onTouchStart={ this.onClick.bind(this) }
        onMouseEnter={ this.onMouseEnter.bind(this) }
        onMouseLeave={ this.onMouseLeave.bind(this) }
        {... props }
        >
        { props.children }
      </div>
    </Tooltip>;
  }
}

export {
  TooltipWrapper,
}
