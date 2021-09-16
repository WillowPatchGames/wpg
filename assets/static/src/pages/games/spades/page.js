import React from 'react';

import '../../../main.scss'

import { GenericGamePage } from '../page.js';

import { SpadesGameComponent } from './component.js';
import { SpadesGameSynopsis } from './synopsis.js';

class SpadesGamePage extends React.Component {
  render() {
    return (
      <GenericGamePage {...this.props} configuration={ true } immersive={ false } synopsis={ SpadesGameSynopsis } component={ SpadesGameComponent } />
    );
  }
}

export {
  SpadesGamePage
};
