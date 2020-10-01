import requests

from common import *

game_config = {
    'num_players': 4,
    'num_tiles': 50,
    'tiles_per_player': True,
    'start_size': 15,
    'draw_size': 1,
    'discard_penalty': 3,
    'frequency': 1,
}

def test_create_get_game():
    # Sending the first request should be fine
    user_data, token = auth_user('test_game_test_create_get_game')

    headers = {'X-Auth-Token': token}

    room_req = {
        'owner': user_data['id'],
        'style': 'single',
        'open': True
    }

    room_resp = requests.post(URL + "/rooms", json=room_req, headers=headers)

    print(room_resp, room_resp.json())

    assert room_resp.status_code == 200

    room_data = room_resp.json()

    req = {
        'owner': user_data['id'],
        'room': room_data['id'],
        'style': 'rush',
        'open': True,
        'config': game_config
    }

    resp = requests.post(URL + "/games", json=req, headers=headers)

    print(resp, resp.json())

    assert resp.status_code == 200

    game_data = resp.json()

    assert 'id' in game_data
    assert 'owner' in game_data and game_data['owner'] == user_data['id']
    assert 'style' in game_data and game_data['style'] == 'rush'
    assert 'open' in game_data and game_data['open'] == True
    assert 'lifecycle' in game_data and game_data['lifecycle'] == 'pending'

    resp = requests.get(URL + "/game/" + str(game_data['id']), headers=headers)

    print(resp, resp.json())

    assert resp.status_code == 200

    get_data = resp.json()

    for key in game_data:
        if key in get_data:
            assert game_data[key] == get_data[key]

def test_create_no_room_game():
    # Sending the first request should be fine
    user_data, token = auth_user('test_game_test_create_no_room')

    headers = {'X-Auth-Token': token}

    req = {
        'owner': user_data['id'],
        'style': 'rush',
        'open': True,
        'config': game_config
    }

    resp = requests.post(URL + "/games", json=req, headers=headers)

    print(resp, resp.json())

    assert resp.status_code == 200

    game_data = resp.json()

    assert 'id' in game_data
    assert 'owner' in game_data and game_data['owner'] == user_data['id']
    assert 'style' in game_data and game_data['style'] == 'rush'
    assert 'open' in game_data and game_data['open'] == True
    assert 'lifecycle' in game_data and game_data['lifecycle'] == 'pending'

    resp = requests.get(URL + "/game/" + str(game_data['id']), headers=headers)

    print(resp, resp.json())

    assert resp.status_code == 200

    get_data = resp.json()

    for key in game_data:
        if key in get_data:
            assert game_data[key] == get_data[key]
