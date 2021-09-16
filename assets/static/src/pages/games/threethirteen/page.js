import React from 'react';

import '../../../main.scss'

import { GenericGamePage } from '../page.js';

import { ThreeThirteenGameComponent } from './component.js';
import { ThreeThirteenGameSynopsis } from './synopsis.js';

class ThreeThirteenGamePage extends React.Component {
  render() {
    return (
      <GenericGamePage {...this.props} configuration={ true } synopsis={ ThreeThirteenGameSynopsis } component={ ThreeThirteenGameComponent } />
    );
  }
}

export {
  ThreeThirteenGamePage
};
