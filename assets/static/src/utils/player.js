import React from 'react';

import { Avatar } from '@rmwc/avatar';
import '@rmwc/avatar/styles';
import { Tooltip } from '@rmwc/tooltip';
import '@rmwc/tooltip/styles';
import { CircularProgress } from '@rmwc/circular-progress';
import '@rmwc/circular-progress/styles';

import { team_colors } from '../pages/games/team_colors.js';
import { gravatarify } from './gravatar.js';

class PlayerAvatar extends React.Component {
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
    var user = this.props.user;
    var size = this.props.size || "large";
    var loading = this.props.loading;
    var color = this.props.team_color || team_colors[this.props.team];
    return <Tooltip align="right" content={ user.display } open={ this.state.tooltip } activateOn={[]}>
      <div className={"avatar-progress avatar-progress--"+size} style={{ display: "inline-block" }}
        onClick={ this.onClick.bind(this) }
        onTouchStart={ this.onClick.bind(this) }
        onMouseEnter={ this.onMouseEnter.bind(this) }
        onMouseLeave={ this.onMouseLeave.bind(this) }
        >
        <Avatar src={ gravatarify(user) } name={ user.display } size={ size } />
        { !loading ? null : <CircularProgress size={ size } style={{ "--stroke-color": color }}/> }
      </div>
    </Tooltip>;
  }
}

export {
  PlayerAvatar,
}
