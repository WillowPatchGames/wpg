import requests

from common import *

def test_create_get_game():
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

    print(resp, resp.json())

    assert resp.status_code == 200

    game_data = resp.json()

    assert 'id' in game_data
    assert 'owner' in game_data and game_data['owner'] == user_data['id']
    assert 'style' in game_data and game_data['style'] == 'rush'
    assert 'open' in game_data and game_data['open'] == True
    assert 'lifecycle' in game_data and game_data['lifecycle'] == 'pending'

    resp = requests.get(URL + "/game/" + str(game_data['id']))

    assert resp.status_code == 200

    get_data = resp.json()

    for key in game_data:
        if key in get_data:
            assert game_data[key] == get_data[key]
