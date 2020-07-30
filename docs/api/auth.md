# Authentication (`/auth`)

## `POST on /auth`

Accepts either JSON or Form Data. Field names the same between the two.

### Request Data

```json
{
    "username": str,
    "email": str,
    "password": str
}
```

Note that only one of `email` or `username` need to be present.

### Response Data

 - On bad data: 400 Bad Request
 - On incorrect password: 403 Unauthorized
 - On other error: 500 Internal Server
 - On accept, JSON or data below.

```json
{
    "id": int,
    "username": str,
    "email": str,
    "token": str
}
```

Token must be specified with all future requests over e.g., the game's
websocket or when creating the game.
