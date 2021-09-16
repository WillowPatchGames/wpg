import React from 'react';

import '../../../main.scss'

import { GenericGamePage } from '../page.js';

import { GinGameComponent } from './component.js';
import { GinGameSynopsis } from './synopsis.js';

class GinGamePage extends React.Component {
  render() {
    return (
      <GenericGamePage {...this.props} configuration={ true } immersive={ false } synopsis={ GinGameSynopsis } component={ GinGameComponent } />
    );
  }
}

export {
  GinGamePage
};
