import { UserModel, GameModel } from '../models.js';

function loaded(v) {
  return v !== undefined && v !== null && v.model && !v.model.error && v.model.display;
}

class UserCacheSingleton {
  constructor() {
    this.cache = {};
    this.access_threshhold = 100;
  }

  async FromId(id) {
    if (typeof id !== 'number') return id;
    if (!loaded(this.cache[id]) || this.cache[id].access === this.access_threshhold) {
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
    this.access_threshhold = 20;
  }

  async FromId(user, id) {
    if (this.user !== user) {
      this.cache = {};
      this.user = user;
    }

    if (!loaded(this.cache[id]) || this.cache[id].access === this.access_threshhold) {
      this.cache[id] = await {
        model: await GameModel.FromId(user, id),
        access: 0,
      };
    }

    this.cache[id].access += 1;

    return this.cache[id].model;
  }

  Invalidate(id) {
    if (loaded(this.cache[id])) {
      this.cache[id] = null;
    }
  }
}

var GameCache = new GameCacheSingleton();

export {
  UserCache,
  GameCache,
}
