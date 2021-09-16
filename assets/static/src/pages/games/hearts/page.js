import React from 'react';

import '../../../main.scss'

import { GenericGamePage } from '../page.js';

import { HeartsGameComponent } from './component.js';
import { HeartsGameSynopsis } from './synopsis.js';

class HeartsGamePage extends React.Component {
  render() {
    return (
      <GenericGamePage {...this.props} configuration={ true } immersive={ false } synopsis={ HeartsGameSynopsis } component={ HeartsGameComponent } />
    );
  }
}

export {
  HeartsGamePage
};
