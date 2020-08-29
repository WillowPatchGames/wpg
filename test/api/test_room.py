import requests

from common import *

def test_create_get_room():
    # Sending the first request should be fine
    user_data, token = auth_user('test_room_test_create_get_room')

    headers = {'X-Auth-Token': token}

    req = {
        'owner': user_data['id'],
        'style': 'single',
        'open': True
    }

    resp = requests.post(URL + "/rooms", json=req, headers=headers)

    print(resp, resp.json())

    assert resp.status_code == 200

    room_data = resp.json()

    assert 'id' in room_data
    assert 'owner' in room_data and room_data['owner'] == user_data['id']
    assert 'style' in room_data and room_data['style'] == 'single'
    assert 'open' in room_data and room_data['open'] == True

    resp = requests.get(URL + "/room/" + str(room_data['id']), headers=headers)

    assert resp.status_code == 200

    get_data = resp.json()

    for key in room_data:
        if key in get_data:
            assert room_data[key] == get_data[key]
