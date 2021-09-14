import { RushGame } from '../../games/rush.js';
import { SpadesGame } from '../../games/spades.js';
import { ThreeThirteenGame } from '../../games/threethirteen.js';
import { HeartsGame } from '../../games/hearts.js';
import { EightJacksGame } from '../../games/eightjacks.js';
import { GinGame } from '../../games/gin.js';

function loadGame(game) {
  if (!game || !game.endpoint) return null;

  if (!game.interface) {
    // XXX: Update to support multiple game types.
    var mode = game.mode || game.style;
    if (mode === "rush") {
      game.interface = new RushGame(game);
    } else if (mode === "spades") {
      game.interface = new SpadesGame(game);
    } else if (mode === "three thirteen") {
      game.interface = new ThreeThirteenGame(game);
    } else if (mode === "hearts") {
      game.interface = new HeartsGame(game);
    } else if (mode === "eight jacks") {
      game.interface = new EightJacksGame(game);
    } else if (mode === "gin") {
      game.interface = new GinGame(game);
    } else {
      console.log("Unknown game mode:", mode);
    }
  }

  return game;
}

function addEv(game, events) {
  if (!game || !game.interface) {
    console.trace("Got passed game with empty interface interface", game);
    return () => { console.log("Empty game interface"); };
  }

  let unmounts = [];
  for (let message_type in events) {
    var handler = events[message_type];
    let unmount = game.interface.controller.onMessage(message_type, handler);
    unmounts.push(unmount);
  }

  return () => {
    for (let unmount of unmounts) {
      if (unmount !== undefined && unmount !== null) {
        unmount();
      }
    }
  };
}

function notify(snackbar, message, type) {
  if (typeof snackbar === 'function') {
    return snackbar(message, type);
  }
  snackbar.clearAll();
  snackbar.notify({
    body: message,
    dismissesOnAction: true,
    timeout: type === "error" ? 7000 : 3000,
    actions: [{ title: type === "error" ? "Aw shucks" : "Cool" }],
  });
}

function killable(func, interval) {
  var killer = {};
  killer.func = func;
  killer.interval = interval;
  killer.kill = () => { clearTimeout(killer.timeout) };
  killer.exec = () => { killer.kill() ; killer.func() ; killer.restart() };
  killer.restart = () => { killer.timeout = setTimeout(() => { killer.exec() }, killer.interval) };
  return killer;
}

export { loadGame, addEv, notify, killable };
