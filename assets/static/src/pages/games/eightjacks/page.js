import React from 'react';

import '../../../main.scss'

import { GenericGamePage } from '../page.js';

import { EightJacksGameComponent } from './component.js';
import { EightJacksGameSynopsis } from './synopsis.js';

class EightJacksGamePage extends React.Component {
  render() {
    return (
      <GenericGamePage {...this.props} configuration={ true } immersive={ false } synopsis={ EightJacksGameSynopsis } component={ EightJacksGameComponent } />
    );
  }
}

export {
  EightJacksGamePage
};
