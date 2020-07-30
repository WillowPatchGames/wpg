import requests

from common import *

def test_auth_user():
    # Sending the first request should be fine
    req = {'username': 'auth', 'email': 'auth@alpha.net', 'password': 'letmein'}
    resp = requests.post(URL + "/users", json=req)

    assert resp.status_code == 200

    resp_data = resp.json()
    assert resp_data is not None
    assert 'id' in resp_data
    assert 'username' in resp_data
    assert 'display' in resp_data
    assert 'email' in resp_data

    # But going again should result in an error
    auth_req = {'username': req['username'], 'password': req['password']}
    resp = requests.post(URL + "/auth", json=auth_req)

    assert resp.status_code == 200

    api_token = resp.json()['token']
    assert api_token is not None
    assert len(api_token) > 0
