import requests

HOSTNAME = "localhost"
PORT = 8042
URL = f"http://{HOSTNAME}:{PORT}"

def auth_user(username):
    create_req = {'username': username, 'email': username + '@alpha.net', 'password': 'letmein'}
    resp = requests.post(URL + "/users", json=create_req)

    assert resp.status_code == 200

    user_data = resp.json()

    auth_req = {'username': create_req['username'], 'password': create_req['password']}
    resp = requests.post(URL + "/auth", json=auth_req)

    assert resp.status_code == 200

    auth_data = resp.json()

    assert 'token' in auth_data

    return user_data, auth_data['token']
