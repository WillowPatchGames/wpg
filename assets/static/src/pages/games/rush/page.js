import React from 'react';

import '../../../main.scss'

import { GenericGamePage } from '../page.js';

import { RushGameComponent } from './component.js';
import { RushGameSynopsis } from './synopsis.js';

class RushGamePage extends React.Component {
  render() {
    return (
      <GenericGamePage {...this.props} configuration={ false } immersive={ true } synopsis={ RushGameSynopsis } component={ RushGameComponent } />
    );
  }
}

export {
  RushGamePage
};
