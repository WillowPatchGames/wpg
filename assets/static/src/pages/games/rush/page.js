import '../../../main.scss'

import { GenericGamePage } from '../page.js';

import { RushAfterPartyComponent } from './afterparty.js';
import { RushGameComponent } from './component.js';
import { RushGameSynopsis } from './synopsis.js';

class RushGamePage extends GenericGamePage {
  pageLayout() {
    return {
      configuration: true,
      finished_synopsis: true,
      immersive: true,
      synopsis: RushGameSynopsis,
      player: RushGameComponent,
      afterparty: RushAfterPartyComponent,
    };
  }
}

export {
  RushGamePage
};
