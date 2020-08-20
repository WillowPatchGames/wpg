# Game WebSocket

A game's WebSocket is initiated with the following exchange:

    client -> server: init
    server -> client: ok/wait
    server -> client: begin

At any time, if the client or server sends a fatal error message, the
server will close the connection.

The init message (sent from client to server) determines which type of
game this WebSocket contains. Currently there is only one, realtime.

## Realtime Game

A realtime game begins with the following exchange (after the server
sends the `begin` message):

    server -> client: initial-draw

Then, when a client performs an action, the server will confirm:

    client -> server: action
    server -> client: confirm

Finally, when the game ends, a client will end the connection.
