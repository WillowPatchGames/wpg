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
    this.guest = false;

    this.api = window.location.protocol + '//' + window.location.host + '/api/v1';

    this.authed = false;
    this.token = null;
    this.login_uri = this.api + '/auth';
    this.create_uri = this.api + '/users';
    this.error = null;
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

    var uri = ret.api + '/user';
    if (id !== null) {
        uri = uri + '/' + id;
    }

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

  async plans() {
    var plans_uri = this.api + '/user/' + this.id + '/plans';
    const response = await fetch(plans_uri, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Auth-Token': this.token,
      },
      redirect: 'follow',
    });

    const data = await response.json();
    if ('type' in data && data['type'] === 'error') {
      console.log(data);
      return data;
    }

    var result = [];
    for (let plan_data of data) {
      var plan = new UserPlanModel(this);
      Object.assign(plan, plan_data);
      result.push(plan);
    }

    return result;
  }

  async enroll2FA(device) {
    var request = {};
    if (nonempty(device)) {
      request['device'] = device;
    }

    var enroll_uri = this.api + '/user/' + this.id + '/totp';
    const response = await fetch(enroll_uri, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Auth-Token': this.token,
      },
      redirect: 'follow',
      body: JSON.stringify(request)
    });

    var result = await response.json();
    if (!('type' in result && result['type'] === 'error')) {
      result['image'] = this.api + '/user/' + this.id + '/totp/' + result['device'] + '/image?api_token=' + this.token;
    }

    return result;
  }

  async enrollConfirm2FA(device, token) {
    var request = {};
    if (nonempty(device)) {
      request['device'] = device;
      request['token'] = token;
    }

    var validate_uri = this.api + '/user/' + this.id + '/totp/validate';
    const response = await fetch(validate_uri, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Auth-Token': this.token,
      },
      redirect: 'follow',
      body: JSON.stringify(request)
    });

    return await response.json();
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

class PlanModel {
  constructor() {
    this.id = 0;
    this.slug = null;
    this.name = null;
    this.description = null;
    this.open = false;
    this.visible = false;
    this.min_price_cents = null;
    this.suggested_price_cents = null;
    this.max_price_cents = null;
    this.billed = null;
    this.create_room = null;
    this.max_open_rooms = null;
    this.max_total_rooms = null;
    this.max_open_games_in_room = null;
    this.max_total_games_in_room = null;
    this.max_players_in_room = null;
    this.max_rooms_in_timeframe_count = null;
    this.max_rooms_in_timeframe_duration = null;
    this.create_game = null;
    this.max_open_games = null;
    this.max_total_games = null;
    this.max_players_in_game = null;
    this.max_spectators_in_game = null;
    this.max_games_in_timeframe_count = null;
    this.max_games_in_timeframe_duration = null;
    this.available_game_styles = null;
    this.can_audio_chat = null;
    this.can_video_chat = null;

    this.api = window.location.protocol + '//' + window.location.host + '/api/v1';

    this.token = null;
    this.login_uri = this.api + '/auth';
    this.create_uri = this.api + '/users';
    this.error = null;
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
    var ret = new PlanModel();

    var uri = ret.api + '/plan/' + id;

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
    return ret;
  }

  static async active() {
    var ret = new PlanModel();

    var uri = ret.api + '/plans';
    const response = await fetch(uri, {
      method: 'GET',
      redirect: 'follow',
    });

    const data = await response.json();

    if ('type' in data && data['type'] === 'error') {
      console.log(data);
      return data;
    }

    var result = [];
    for (let plan_id of data) {
      result.push(PlanModel.FromId(plan_id));
    }

    return await Promise.all(result);
  }
}

class UserPlanModel {
  constructor(user) {
    this.plan_id = 0;
    this.active = false;
    this.price_cents = 0;
    this.billing_frequency = 0;
    this.expires = null;
    this.events = [];

    this.api = window.location.protocol + '//' + window.location.host + '/api/v1';

    this.user = user !== undefined ? user : null;
    this.token = user !== null ? user.token : null;
    this.error = null;
  }

  static FromJSON(serialization) {
    var ret = new UserPlanModel();
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

  async plan() {
    return await PlanModel.FromId(this.plan_id);
  }

  rooms() {
    var rooms = [];

    if (this.events !== null) {
      for (let event of this.events) {
        if (event.room_id !== undefined && event.room_id !== null) {
          if (rooms.indexOf(event.room_id) === -1) {
            rooms.push(event.room_id);
          }
        }
      }
    }

    return rooms;
  }

  games_in_room(room_id) {
    var games = [];

    if (this.events !== null) {
      for (let event of this.events) {
        if (event.game_id !== undefined && event.game_id !== null) {
          if (event.room_id !== undefined && event.room_id !== null) {
            continue;
          }

          if (event.room_id !== room_id) {
            continue;
          }

          if (games.indexOf(event.game_id) === -1) {
            games.push(event.game_id);
          }
        }
      }
    }

    return games;
  }

  games() {
    var games = [];

    if (this.events !== null) {
      for (let event of this.events) {
        if (event.game_id !== undefined && event.game_id !== null) {
          if (games.indexOf(event.game_id) === -1) {
            games.push(event.game_id);
          }
        }
      }
    }

    return games;
  }

  games_without_rooms() {
    var games = [];

    if (this.events !== null) {
      for (let event of this.events) {
        if (event.game_id !== undefined && event.game_id !== null) {
          if (event.room_id !== undefined && event.room_id !== null) {
            continue;
          }

          if (games.indexOf(event.game_id) === -1) {
            games.push(event.game_id);
          }
        }
      }
    }

    return games;
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

  async update() {
    var uri = this.api + '/room/' + this.id;

    const response = await fetch(uri, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Auth-Token': this.user.token,
      },
      redirect: 'follow'
    });

    const result = await response.json();

    if ('type' in result && result['type'] === 'error') {
      console.log(result);
      this.error = result;
      return this;
    }

    Object.assign(this, result);
    this.error = null;
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
    this.frequency = null;
  }

  static async FromId(user, id) {
    var ret = new GameModel(user);
    ret.id = id;
    await ret.update();
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
    ret.endpoint = ws() + "//" + document.location.host + "/api/v1/game/" + ret.id + "/ws?user_id=" + ret.user.id + '&api_token=' + ret.user.token;
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
        'tiles_per_player': this.tiles_per_player,
        'frequency': this.frequency,
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
    this.endpoint = ws() + "//" + document.location.host + "/api/v1/game/" + this.id + "/ws?user_id=" + this.user.id + '&api_token=' + this.user.token;
    return this;
  }

  async update() {
    var uri = this.api + '/game/' + this.id;

    const response = await fetch(uri, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Auth-Token': this.user.token,
      },
      redirect: 'follow'
    });

    const result = await response.json();

    if ('type' in result && result['type'] === 'error') {
      console.log(result);
      this.error = result;
      return this;
    }

    Object.assign(this, result);
    this.error = null;
    this.endpoint = ws() + "//" + document.location.host + "/api/v1/game/" + this.id + "/ws?user_id=" + this.user.id + '&api_token=' + this.user.token;
    return this;
  }

  async delete() {
    var uri = this.api + '/game/' + this.id;

    const response = await fetch(uri, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'X-Auth-Token': this.user.token,
      },
      redirect: 'follow'
    });

    const result = await response.json();

    if ('type' in result && result['type'] === 'error') {
      console.log(result);
      this.error = result;
      return this;
    }

    Object.assign(this, result);
    this.error = null;
    await this.update();
    return this;
  }
}

export {
  UserModel,
  PlanModel,
  UserPlanModel,
  RoomModel,
  GameModel,
  normalizeCode,
};
