import requests

from common import *

def test_create_game():
    # Sending the first request should be fine
    req = {'username': 'three', 'email': 'three@alpha.net', 'password': 'letmein'}
    resp = requests.post(URL + "/users", json=req)

    assert resp.status_code == 200

    user_data = resp.json()

    req = {
        'owner': user_data['id'],
        'style': 'rush',
        'open': True,
        'config': {
        }
    }

    resp = requests.post(URL + "/games", json=req)

    assert resp.status_code == 200
