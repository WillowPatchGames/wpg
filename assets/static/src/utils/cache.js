import { UserModel } from '../models.js';

function loaded(v) {
  return v !== undefined && v !== null && v.model && !v.model.error && v.model.display;
}

class UserCacheSingleton {
  constructor() {
    this.cache = {};
    this.access_threshhold = 100;
  }

  async FromId(id) {
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

export {
  UserCache,
}
