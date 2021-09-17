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
  onClick(event) {
    event.preventDefault();

    if (this.props.clickHandler) {
      this.props?.clickHandler();
    }

    let now = Date.now()
    if (now > this.time + 200) { // 20 was not enough lol
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

    this.time = now;
  }
  onMouseEnter() {
    if (!this.state.tooltip) {
      this.setState(state => {
        state.tooltip = true;
        state.timeout.reset();
        return state;
      });
    }
    this.time = new Date();
  }
  onMouseLeave() {
    if (this.state.tooltip) {
      this.setState(state => {
        state.tooltip = false;
        state.timeout.kill();
        return state;
      });
    }
    this.time = new Date();
  }
  render() {
    let { content, align, style, clickHandler, ...props } = this.props;
    if (!align) align = "right";
    if (!style) style = {};
    if (clickHandler) style['cursor'] = 'pointer';
    return <Tooltip align={ align } content={ content } open={ this.state.tooltip } activateOn={[]}>
      <div
        onClick={ this.onClick.bind(this) }
        onTouchStart={ this.onMouseEnter.bind(this) }
        onMouseEnter={ this.onMouseEnter.bind(this) }
        onMouseLeave={ this.onMouseLeave.bind(this) }
        style={ style }
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
