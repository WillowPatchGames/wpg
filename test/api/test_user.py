import requests

from common import *

def test_create_user():
    return
    # Sending the first request should be fine
    req = {'username': 'test_user_test_create_user', 'email': 'test_user_test_create_user@alpha.net', 'password': 'letmein'}
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
    return
    # Sending the first request should be fine
    create_user_data, token = auth_user("test_user_test_create_get")

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

def test_update():
    # Sending the first request should be fine
    create_user_data, token = auth_user("user_test_update")

    headers = {'X-Auth-Token': token}

    resp = requests.get(f"{URL}/user?id={create_user_data['id']}", headers=headers)
    assert resp.status_code == 200
    get_user_data = resp.json()
    for key in create_user_data:
        assert create_user_data[key] == get_user_data[key]

    req = {
        "email": "test_user_test_update@something.net",
        "display": "something",
        "fields": ["email", "display"]
    }
    resp = requests.patch(f"{URL}/user/{create_user_data['id']}", headers=headers, json=req)
    print(resp.json())
    assert resp.status_code == 200

    resp = requests.get(f"{URL}/user?id={create_user_data['id']}", headers=headers)
    print(resp.json())
    assert resp.status_code == 200

    get_user_data = resp.json()
    for key in ['email', 'display']:
        assert create_user_data[key] != get_user_data[key]
        assert get_user_data[key] == req[key]
