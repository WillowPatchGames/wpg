import requests

from common import *

def test_create_user():
    # Sending the first request should be fine
    req = {'username': 'one', 'email': 'one@alpha.net', 'password': 'letmein'}
    resp = requests.post(URL + "/users", json=req)

    assert resp.status_code == 200

    resp_data = resp.json()
    assert resp_data is not None
    assert 'id' in resp_data
    assert 'username' in resp_data
    assert 'display' in resp_data
    assert 'email' in resp_data

    # But going again should result in an error
    resp = requests.post(URL + "/users", json=req)

    assert resp.status_code != 200

def test_create_get():
    # Sending the first request should be fine
    create_user_data, token = auth_user("two")

    headers = {'X-Auth-Token': token}

    resp = requests.get(f"{URL}/user?id={create_user_data['id']}", headers=headers)
    assert resp.status_code == 200
    get_user_data = resp.json()
    for key in create_user_data:
        assert create_user_data[key] == get_user_data[key]

    resp = requests.get(f"{URL}/user/{create_user_data['id']}", headers=headers)
    assert resp.status_code == 200
    get_user_data = resp.json()
    for key in create_user_data:
        assert create_user_data[key] == get_user_data[key]

    resp = requests.get(f"{URL}/user?username={create_user_data['username']}", headers=headers)
    assert resp.status_code == 200
    get_user_data = resp.json()
    for key in create_user_data:
        assert create_user_data[key] == get_user_data[key]

    resp = requests.get(f"{URL}/user?username={create_user_data['username']}zzzzz", headers=headers)
    assert resp.status_code == 400
