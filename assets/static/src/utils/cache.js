import { UserModel } from '../models.js';

function loaded(v) {
  return v !== undefined && v !== null && !v.error;
}

class UserCacheSingleton {
  constructor() {
    this.cache = {};
    this.access_threshhold = 100;
  }

  async FromId(id) {
    if (!loaded(this.cache[id])) {
      this.cache[id] = {};
      this.cache[id].model = await UserModel.FromId(id);
      this.cache[id].access = 0;
    }

    this.cache[id].access += 1;
    if (this.cache[id].access === this.access_threshhold) {
      // Refresh it for next time.
      this.cache[id].model.refresh();
    }

    return this.cache[id].model;

  }
}

var UserCache = new UserCacheSingleton();

export {
  UserCache,
}
