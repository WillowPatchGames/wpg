# User Creation and Management (`/user`)

## `POST on /user`

Accepts either JSON or Form Data. Field names are the same between the two.

### Request Data

```json
{
    "username": str,
    "email": str,
    "password": str,
    "display": str
}
```

Note that only one of `email` or `username` needs to be present. When `email`
is missing, the user won't be able to reset their password. `display` will be
returned to other users and won't be available for sign in. By default, if
`display` is empty, it will be set as their `username` value.

### Response Data

 - On bad data: 400 bad request
 - On other error: 500 Internal Server
 - on Accept, JSON or data below:

```json
{
    "id": int,
    "username": str,
    "email": str
}
```

Users should then [auth](auth.md).

## `GET on /user/:eid` or `GET on /user` (passing `id`, `username`, or `email`)

From an external identifier, returns identifying information about a user.

This is useful for learning about others in the room. Depending on whether
or not the user passes an API token, certain fields may or may not be
available.

### Response Data

```json
{
    "id": int,
    "username": str,
    "display": str,
    "email": str
}
```
