import '../../../main.scss'

import { GenericGamePage } from '../page.js';

import { HeartsAfterPartyComponent } from './afterparty.js';
import { HeartsGameComponent } from './component.js';
import { HeartsGameSynopsis } from './synopsis.js';

class HeartsGamePage extends GenericGamePage {
  pageLayout() {
    return {
      configuration: true,
      finished_synopsis: false,
      immersive: false,
      synopsis: HeartsGameSynopsis,
      player: HeartsGameComponent,
      afterparty: HeartsAfterPartyComponent,
    };
  }
}

export {
  HeartsGamePage
};
