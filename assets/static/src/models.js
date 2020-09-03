function nonempty(str) {
  return str !== undefined && str !== null && str !== "";
}

function normalizeCode(str, pretty) {
  if (str === undefined) {
    str = new URLSearchParams(window.location.search).get('code') || "";
  }
  var words = [...str.matchAll(/\w+/g)].map(w => w[0].toLowerCase()).filter(w => w.length > 1);
  if (!pretty) {
    return words.join("-");
  } else {
    return words.map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
  }
}

function ws() {
  if (window.location.protocol === 'https:') {
    return 'wss:';
  }

  return 'ws:';
}

class UserModel {
  constructor() {
    this.id = null;
    this.username = null;
    this.email = null;
    this.display = null;
    this.api = window.location.protocol + '//' + window.location.host + '/api/v1';

    this.authed = false;
    this.token = null;
    this.login_uri = this.api + '/auth';
    this.create_uri = this.api + '/users';
    this.error = null;

    this.guest = false;
  }

  static FromJSON(serialization) {
    var ret = new UserModel();
    try {
      var obj = JSON.parse(serialization);
    } catch (e) {
      return null;
    }
    Object.assign(ret, obj);
    return ret;
  }

  ToJSON() {
    return JSON.stringify(this);
  }

  static async FromId(id, token) {
    var ret = new UserModel();

    var uri = ret.api + '/user/' + id;

    var headers = {
      'Accept': 'application/json',
    };

    if (token) {
      headers['X-Auth-Token'] = token;
    } else if (this.token) {
      headers['X-Auth-Token'] = this.token;
    }

    const response = await fetch(uri, {
      method: 'GET',
      headers: headers,
      redirect: 'follow'
    });

    const result = await response.json();

    if ('type' in result && result['type'] === 'error') {
      console.log(result);

      ret.error = result;
      return ret;
    }

    Object.assign(ret, result);
    if ((ret.username !== '' || ret.email !== '') && token) {
      ret.authed = true;
      ret.token = token;
    }
    return ret;
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
      request['display'] = this.display;
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

    const result = await response.json();
    if ('type' in result && result['type'] === 'error') {
      console.log(result);

      this.error = result;
      return this;
    }

    return this.login(password);
  }

  async createGuest() {
    var request = {'guest': true};
    if (nonempty(this.display)) {
      request['display'] = this.display;
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

    const result = await response.json();
    if ('type' in result && result['type'] === 'error') {
      console.log(result);

      this.error = result;
      return this;
    }

    Object.assign(this, result);
    if (this.token) {
      this.authed = true;
    }

    this.saveGuest();
    return this;
  }

  saveGuest() {
    var guest = {'display': this.display, 'token': this.token, 'id': this.id, 'authed': true};
    localStorage.setItem('guest', JSON.stringify(guest));
  }

  async upgrade(username, email, display, password) {
    var request = {
      'password': password
    };

    if (nonempty(username)) {
      request['username'] = username;
    }
    if (nonempty(email)) {
      request['email'] = email;
    }
    if (nonempty(display)) {
      request['display'] = display;
    }

    var upgrade_uri = this.api + '/user/' + this.id + '/upgrade';

    const response = await fetch(upgrade_uri, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Auth-Token': this.token,
      },
      redirect: 'follow',
      body: JSON.stringify(request)
    });

    const result = await response.json();
    if ('type' in result && result['type'] === 'error') {
      console.log(result);

      this.error = result;
      return this;
    }

    localStorage.removeItem('guest');

    Object.assign(this, result);
    return this.login(password);
  }

  async save(fields) {
    var request = {'fields': []};

    for (let key in fields) {
     if (key === "old_password" && key === "new_password") {
        request['fields'].push('password');
      } else {
        request['fields'].push(key);
      }

      request[key] = fields[key];
    }

    var save_uri = this.api + '/user/' + this.id;
    const response = await fetch(save_uri, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Auth-Token': this.token
      },
      redirect: 'follow',
      body: JSON.stringify(request)
    });

    const result = await response.json();
    if ('type' in result && result['type'] === 'error') {
      console.log(result);

      this.error = result;
      return this;
    }

    Object.assign(this, result);

    const other = await UserModel.FromId(this.id, this.token);
    Object.assign(this, other);

    return this;
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

    const result = await response.json();
    if ('type' in result && result['type'] === 'error') {
      console.log(result);

      this.error = result;
      return this;
    }

    Object.assign(this, result);

    this.authed = true;

    const other = await UserModel.FromId(this.id, this.token);
    Object.assign(this, other);

    return this;
  }

  async logout() {
    this.token = null;
    this.authed = false;
    localStorage.clear();
  }
}

class RoomModel {
  constructor(user) {
    this.id = null;
    this.user = user;
    this.api = window.location.protocol + '//' + window.location.host + '/api/v1';
    this.create_uri = this.api + '/rooms';

    this.mode = null;
    this.open = null;
    this.code = null;
  }

  static async FromId(id) {
    var ret = new RoomModel();

    var uri = ret.api + '/room/' + id;

    const response = await fetch(uri, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Auth-Token': ret.user.token,
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
    ret.endpoint = ws() + "//" + document.location.host + "/room/" + ret.id + "/ws?user_id=" + ret.user.id + '&api_token=' + ret.user.token;
    return ret;
  }

  static async FromCode(user, code) {
    code = normalizeCode(code);
    var ret = new RoomModel(user);
    ret.code = code;

    var uri = ret.api + '/room/find?join=' + code;

    const response = await fetch(uri, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Auth-Token': ret.user.token,
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
    ret.endpoint = ws() + "//" + document.location.host + "/room/" + ret.id + "/ws?user_id=" + ret.user.id + '&api_token=' + ret.user.token;
    return ret;
  }

  async create() {
    var request = {
      'owner': this.user.id,
      'style': this.mode,
      'open': this.open,
    };

    const response = await fetch(this.create_uri, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Auth-Token': this.user.token,
      },
      redirect: 'follow',
      body: JSON.stringify(request)
    });

    const result = await response.json();
    if ('type' in result && result['type'] === 'error') {
      console.log(result);

      this.error = result;
      return this;
    }

    this.error = null;
    delete result["config"];
    Object.assign(this, result);
    this.endpoint = ws() + "//" + document.location.host + "/room/" + this.id + "/ws?user_id=" + this.user.id + '&api_token=' + this.user.token;
    return this;
  }
}

class GameModel {
  constructor(user) {
    this.id = null;
    this.user = user;
    this.api = window.location.protocol + '//' + window.location.host + '/api/v1';
    this.create_uri = this.api + '/games';
    this.room = null;

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

    var uri = ret.api + '/game/' + id;

    const response = await fetch(uri, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Auth-Token': ret.user.token,
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
    ret.endpoint = ws() + "//" + document.location.host + "/game/" + ret.id + "/ws?user_id=" + ret.user.id + '&api_token=' + ret.user.token;
    return ret;
  }

  static async FromCode(user, code) {
    code = normalizeCode(code);
    var ret = new GameModel(user);
    ret.code = code;

    var uri = ret.api + '/game/find?join=' + code;

    const response = await fetch(uri, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Auth-Token': ret.user.token,
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
    ret.endpoint = ws() + "//" + document.location.host + "/game/" + ret.id + "/ws?user_id=" + ret.user.id + '&api_token=' + ret.user.token;
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

    if (this.room !== null) {
      request['room'] = this.room.id;
    }

    const response = await fetch(this.create_uri, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Auth-Token': this.user.token,
      },
      redirect: 'follow',
      body: JSON.stringify(request)
    });

    const result = await response.json();
    if ('type' in result && result['type'] === 'error') {
      console.log(result);

      this.error = result;
      return this;
    }

    this.error = null;
    delete result["config"];
    Object.assign(this, result);
    this.endpoint = ws() + "//" + document.location.host + "/game/" + this.id + "/ws?user_id=" + this.user.id + '&api_token=' + this.user.token;
    return this;
  }
}

export {
  UserModel,
  RoomModel,
  GameModel,
  normalizeCode,
};
