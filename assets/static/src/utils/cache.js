import { UserModel, GameModel } from '../models.js';

function uloaded(v) {
  return v !== undefined && v !== null && v.model && !v.model.error && v.model.display;
}

function gloaded(v) {
  return v !== undefined && v !== null && v.model && !v.model.error && v.model.style;
}

class UserCacheSingleton {
  constructor() {
    this.cache = {};
    this.access_threshhold = 100;
  }

  async FromId(id) {
    if (typeof id !== 'number') return id;

    var threshhold = +this.access_threshhold + Math.floor(Math.random() * 20 - 10);
    if (!uloaded(this.cache[id]) || +this.cache[id].access >= +threshhold) {
      this.cache[id] = await {
        model: await UserModel.FromId(id),
        access: 0,
      };
    }

    this.cache[id].access += 1;

    return this.cache[id].model;
  }
}

var UserCache = new UserCacheSingleton();


class GameCacheSingleton {
  constructor() {
    this.user = null;
    this.cache = {};
    this.access_threshhold = 100;
  }

  async FromId(user, id) {
    if (this.user !== user) {
      this.cache = {};
      this.user = user;
    }

    // Avoid a thundering herd; spread out retries.
    var threshhold = +this.access_threshhold + Math.floor(Math.random() * 20 - 10);
    if (!gloaded(this.cache[id]) || +this.cache[id].access >= +threshhold) {
      this.cache[id] = await {
        model: await GameModel.FromId(user, id),
        access: 0,
      };
    }

    this.cache[id].access += 1;

    return this.cache[id].model;
  }

  Invalidate(id) {
    if (gloaded(this.cache[id])) {
      this.cache[id] = null;
    }
  }
}

var GameCache = new GameCacheSingleton();

export {
  UserCache,
  GameCache,
}
