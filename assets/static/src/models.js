import { UserCache } from './utils/cache.js';

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
    return await this.login(password);
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
    if (data !== null && 'type' in data && data['type'] === 'error') {
      console.log(data);
      return data;
    }

    var result = [];
    if (data !== null) {
      for (let plan_data of data) {
        var plan = new UserPlanModel(this);
        Object.assign(plan, plan_data);
        result.push(plan);
      }
    }

    return result;
  }

  async gameSearch(lifecycle, room_id) {
    var games_uri = this.api + '/user/' + this.id;
    if (room_id !== undefined && room_id !== null) {
      games_uri += "/rooms/" + room_id;
    }
    games_uri += "/games";
    if (nonempty(lifecycle) && lifecycle !== "any") {
      games_uri += "/" + lifecycle;
    }

    const response = await fetch(games_uri, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Auth-Token': this.token,
      },
      redirect: 'follow',
    });

    const data = await response.json();
    if (data !== null && 'type' in data && data['type'] === 'error') {
      console.log(data);
      return data;
    }

    var result = [];
    if (data !== null) {
      for (let game_data of data) {
        var game_obj = await GameModel.FromId(this, game_data.game_id);
        game_data['game'] = game_obj;

        if ('room_id' in game_data && game_data['room_id'] !== undefined && game_data['room_id'] !== null && game_data['room_id'] !== 0) {
          var room_obj = await RoomModel.FromId(this, game_data.room_id);
          game_data['room'] = room_obj;
        }

        result.push(game_data);
      }
    }

    return result;
  }

  async roomSearch(lifecycle) {
    var rooms_uri = this.api + '/user/' + this.id + '/rooms';
    if (nonempty(lifecycle) && lifecycle !== "any") {
      rooms_uri += "/" + lifecycle;
    }

    const response = await fetch(rooms_uri, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Auth-Token': this.token,
      },
      redirect: 'follow',
    });

    const data = await response.json();
    if (data !== null && 'type' in data && data['type'] === 'error') {
      console.log(data);
      return data;
    }

    var result = [];
    if (data !== null) {
      for (let room_data of data) {
        var room_obj = await RoomModel.FromId(this, room_data.room_id);
        room_data['room'] = room_obj;

        result.push(room_data);
      }
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
      result['image'] = this.totpImage(result['device'])
    }

    return result;
  }

  totpImage(device) {
    return this.api + '/user/' + this.id + '/totp/' + device + '/image?api_token=' + this.token;
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

  async list2FA() {
    var list_uri = this.api + '/user/' + this.id + '/totp';
    const response = await fetch(list_uri, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Auth-Token': this.token,
      },
      redirect: 'follow',
    });

    return await response.json();
  }

  async rename2FA(current, future) {
    var request = {};
    if (nonempty(current)) {
      request['device'] = current;
    }
    if (nonempty(future)) {
      request['future'] = future;
    }

    var unenroll_uri = this.api + '/user/' + this.id + '/totp';
    const response = await fetch(unenroll_uri, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Auth-Token': this.token,
      },
      redirect: 'follow',
      body: JSON.stringify(request),
    });

    return await response.json();
  }

  async remove2FA(device, password) {
    var request = {};
    if (nonempty(device)) {
      request['device'] = device;
    }
    if (nonempty(password)) {
      request['password'] = password;
    }

    var unenroll_uri = this.api + '/user/' + this.id + '/totp';
    const response = await fetch(unenroll_uri, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Auth-Token': this.token,
      },
      redirect: 'follow',
      body: JSON.stringify(request),
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

    this.authed = !result.need2fa;

    if (this.authed) {
      const other = await UserModel.FromId(this.id, this.token);
      Object.assign(this, other);
    }

    return this;
  }

  async provide2FA(token) {
    var request = {'token': token};
    if (nonempty(this.username)) {
      request['username'] = this.username;
    } else if (nonempty(this.email)) {
      request['email'] = this.email;
    }

    if (nonempty(this.token)) {
      request['temporary'] = this.token;
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

    this.authed = !result.need2fa;

    if (this.authed) {
      const other = await UserModel.FromId(this.id, this.token);
      Object.assign(this, other);
    }

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

  async checkout(price_cents) {
    var request = {
      'price_cents': price_cents,
    };

    var uri = this.api + '/plan/' + this.id + '/checkout';
    const response = await fetch(uri, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'X-Auth-Token': this.token,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(request),
    });

    var data = await response.json();
    if ('type' in data && data['type'] === 'error') {
      console.log(data);
      return data;
    }

    return data;
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

  static async FromId(user, id) {
    var ret = new RoomModel(user);
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
      'config': this.config,
    };

    const response = await fetch(this.create_uri, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Auth-Token': this.user.token,
      },
      redirect: 'follow',
      body: JSON.stringify(request),
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

    if (this.members !== undefined && this.members !== null && this.members.length > 0) {
      for (let member of this.members) {
        member.user = await UserCache.FromId(member.user_id);
      }
    }

    return this;
  }

  async admitPlayer(user_id, admitted, banned) {
    var request = {
      'user_id': user_id,
      'admitted': admitted,
      'banned': banned,
    }

    var uri = this.api + '/room/' + this.id + '/admit';
    const result = await fetch(uri, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Auth-Token': this.user.token,
      },
      redirect: 'follow',
      body: JSON.stringify(request),
    });

    if ('type' in result && result['type'] === 'error') {
      console.log(result);
      return result;
    }

    return await this.update();
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

    this.config = {};
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

  static async LoadConfig() {
    var base_uri = window.location.protocol + '//' + window.location.host + '/api/v1';
    var uri = base_uri + '/games/config';

    const response = await fetch(uri, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      redirect: 'follow',
    });

    let result = await response.json();
    for (var game in result) {
      for (var option in result[game].options) {
        let type = result[game].options[option].values.type;
        if (type === 'int' || type === 'enum') {
          result[game].options[option].values.value = (x) => +x;
        } else {
          result[game].options[option].values.value = (x) => x;
        }
      }
    }

    return result;
  }

  async create() {
    var request = {
      'owner': this.user.id,
      'style': this.mode,
      'open': this.open,
      'config': this.config,
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
  ws,
};
