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

export {
  AuthedUserModel
};
