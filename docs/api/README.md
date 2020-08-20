# WordCorp

## Authenticated Endpoints

When an endpoint is authenticated, first [auth](auth.md) before attempting to
access it. The result is an API token. This can be used three ways:

 1. Via a query string `token=<value>` parameter,
 2. Via a HTTP bearer token in the authentication field,
 3. Inside the websocket.
