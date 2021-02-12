import React from 'react';

import { Tooltip } from '@rmwc/tooltip';
import '@rmwc/tooltip/styles';

class TooltipWrapper extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      tooltip: false,
    };
    this.time = 0;
  }
  onClick() {
    if (Date.now() > this.time + 200) { // 20 was not enough lol
      this.setState(state => {
        state.tooltip = !state.tooltip;
        return state;
      });
    }
    this.time = Date.now();
  }
  onMouseEnter() {
    if (!this.state.tooltip) {
      this.setState(state => Object.assign(state, {tooltip:true}));
    }
    this.time = Date.now();
  }
  onMouseLeave() {
    if (this.state.tooltip) {
      this.setState(state => Object.assign(state, {tooltip:false}));
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
