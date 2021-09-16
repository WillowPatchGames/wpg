import '../../../main.scss'

import { GenericGamePage } from '../page.js';

import { SpadesAfterPartyComponent } from './afterparty.js';
import { SpadesGameComponent } from './component.js';
import { SpadesGameSynopsis } from './synopsis.js';

class SpadesGamePage extends GenericGamePage {
  pageLayout() {
    return {
      configuration: true,
      finished_synopsis: false,
      immersive: false,
      synopsis: SpadesGameSynopsis,
      player: SpadesGameComponent,
      afterparty: SpadesAfterPartyComponent,
    };
  }
}

export {
  SpadesGamePage
};
