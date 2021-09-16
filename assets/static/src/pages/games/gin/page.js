import '../../../main.scss'

import { GenericGamePage } from '../page.js';

import { GinAfterPartyComponent } from './afterparty.js';
import { GinGameComponent } from './component.js';
import { GinGameSynopsis } from './synopsis.js';

class GinGamePage extends GenericGamePage {
  pageLayout() {
    return {
      configuration: true,
      finished_synopsis: false,
      immersive: false,
      synopsis: GinGameSynopsis,
      player: GinGameComponent,
      afterparty: GinAfterPartyComponent,
    };
  }
}

export {
  GinGamePage
};
