import '../../../main.scss'

import { GenericGamePage } from '../page.js';

import { ThreeThirteenAfterPartyComponent } from './afterparty.js';
import { ThreeThirteenGameComponent } from './component.js';
import { ThreeThirteenGameSynopsis } from './synopsis.js';

class ThreeThirteenGamePage extends GenericGamePage {
  pageLayout() {
    return {
      configuration: true,
      finished_synopsis: false,
      immersive: false,
      synopsis: ThreeThirteenGameSynopsis,
      player: ThreeThirteenGameComponent,
      afterparty: ThreeThirteenAfterPartyComponent,
    };
  }
}

export {
  ThreeThirteenGamePage
};
