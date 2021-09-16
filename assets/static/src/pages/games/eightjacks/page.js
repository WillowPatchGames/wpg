import '../../../main.scss'

import { GenericGamePage } from '../page.js';

import { EightJacksAfterPartyComponent } from './afterparty.js';
import { EightJacksGameComponent } from './component.js';
import { EightJacksGameSynopsis } from './synopsis.js';

class EightJacksGamePage extends GenericGamePage {
  pageLayout() {
    return {
      configuration: true,
      finished_synopsis: true,
      immersive: false,
      synopsis: EightJacksGameSynopsis,
      player: EightJacksGameComponent,
      afterparty: EightJacksAfterPartyComponent,
    };
  }
}

export {
  EightJacksGamePage
};
