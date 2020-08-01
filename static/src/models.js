function nonempty(str) {
  return str !== undefined && str !== null && str !== "";
}

class UserModel {
  constructor() {
    this.id = null;
    this.username = null;
    this.email = null;
    this.display = null;
    this.api = window.location.protocol + '//' + window.location.host;
  }

  static async FromId(id) {
    var ret = new UserModel();

    var url = ret.api + '/user/' + id;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      redirect: 'follow'
    });

    const result = await response.json();

    if ('type' in result && result['type'] === 'error') {
      console.log(result);

      ret.error = result;
      return ret;
    }

    Object.assign(ret, result);
    return ret;
  }
}

class AuthedUserModel extends UserModel {
  constructor() {
    super();

    this.authed = false;
    this.token = null;
    this.login_uri = this.api + '/auth';
    this.create_uri = this.api + '/users';
    this.error = null;
  }

  async create(password) {
    var request = {'password': password};
    if (nonempty(this.username)) {
      request['username'] = this.username;
    }
    if (nonempty(this.email)) {
      request['email'] = this.email;
    }
    if (nonempty(this.display)) {
      request['email'] = this.display;
    }

    const response = await fetch(this.create_uri, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      redirect: 'follow',
      body: JSON.stringify(request)
    });

    const result = await response.json()
    if ('type' in result && result['type'] === 'error') {
      console.log(result);

      this.error = result;
      return this;
    }

    return this.login(password);
  }

  async login(password) {
    var request = {'password': password};
    if (nonempty(this.username)) {
      request['username'] = this.username;
    } else if (nonempty(this.email)) {
      request['email'] = this.email;
    }

    const response = await fetch(this.login_uri, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      redirect: 'follow',
      body: JSON.stringify(request)
    });

    const result = await response.json()
    if ('type' in result && result['type'] === 'error') {
      console.log(result);

      this.error = result;
      return this;
    }

    Object.assign(this, result);

    this.authed = true;

    const other = await UserModel.FromId(this.id);
    Object.assign(this, other);

    return this;
  }

  async logout() {
    this.token = null;
    this.authed = false;
  }
}

class GameModel {
  constructor(user) {
    this.id = null;
    this.user = user;
    this.api = window.location.protocol + '//' + window.location.host;
    this.create_uri = this.api + '/games';

    this.mode = null;
    this.open = null;
    this.code = null;

    this.spectators = null;
    this.num_players = null;
    this.num_tiles = null;
    this.tiles_per_player = null;
    this.start_size = null;
    this.discard_penalty = null;
  }

  static async FromId(id) {
    var ret = new GameModel();

    var url = ret.api + '/game/' + id;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      redirect: 'follow'
    });

    const result = await response.json();

    if ('type' in result && result['type'] === 'error') {
      console.log(result);

      ret.error = result;
      return ret;
    }

    Object.assign(ret, result);
    ret.error = null;
    return ret;
  }

  async create() {
    var request = {
      'owner': this.user.id,
      'style': this.mode,
      'open': this.open,
      'config': {
        'spectators': this.spectators,
        'num_tiles': this.num_tiles,
        'start_size': this.start_size,
        'draw_size': this.draw_size,
        'discard_penalty': this.discard_penalty,
        'num_players': this.num_players,
        'tiles_per_player': this.tiles_per_player
      }
    };

    const response = await fetch(this.create_uri, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      redirect: 'follow',
      body: JSON.stringify(request)
    });

    const result = await response.json()
    if ('type' in result && result['type'] === 'error') {
      console.log(result);

      this.error = result;
      return this;
    }

    this.error = null;
    delete result["config"];
    Object.assign(this, result);
    return this;
  }
}

export {
  UserModel,
  AuthedUserModel,
  GameModel
};
