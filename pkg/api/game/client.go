package game

import (
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/websocket"

	api_errors "git.cipherboy.com/WillowPatchGames/wpg/pkg/errors"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/auth"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/hwaterr"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
	"git.cipherboy.com/WillowPatchGames/wpg/internal/models"
)

// upgrader takes a regular net/http connection and upgrades it into a
// WebSocket connection.
var upgrader = websocket.Upgrader{
	HandshakeTimeout: connectWait,
	ReadBufferSize:   readBufferSize,
	WriteBufferSize:  sendBufferSize,
}

// readPump() pumps messages from the websocket connection to the hub.
//
// The application runs readPump in a per-connection goroutine. The application
// ensures that there is at most one reader on a connection by executing all
// reads from this goroutine.
func (c *Client) readPump() {
	// When the client connection is closed or an error occurred, unregister this
	// client.
	defer func() {
		c.hub.unregister <- c
		_ = c.conn.Close()
	}()

	// Set a handler to react to pong messages from the client. We don't need to
	// reply (it is an _inbound_ pong). However, we can use it to update our
	// read deadlines to tell the library that the peer is still alive.
	c.conn.SetPongHandler(func(string) error {
		_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))

		return nil
	})

	for {
		// Set the deadline on the read command below.
		_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))

		messageType, message, err := c.conn.ReadMessage()
		if err != nil {
			log.Println("Got an error during reading?", err)
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Println("Got unepected close error:", err)
			}
			return
		}

		if messageType != websocket.TextMessage {
			log.Println("Unexpected message type: " + strconv.Itoa(messageType) + " -- proceeding anyways")
		}

		c.hub.process[c.gameID] <- ClientMessage{c, message}
	}
}

// writePump pumps messages from the hub to the websocket connection.
//
// A goroutine running writePump is started for each connection. The
// application ensures that there is at most one writer to a connection by
// executing all writes from this goroutine.
func (c *Client) writePump() {
	// In order to keep this WebSocket connection open, we have to send ping
	// messages from the server to the client every so often. This period is
	// determined by the pingPeriod constant. Create a ticker so we can be
	// notified when we need to send a new ping message.
	ticker := time.NewTicker(pingPeriod)

	defer func() {
		// If we can no longer write to the client, we should consider the client
		// closed and unregister it from the hub. In the worst case, a new
		// connection will appear with the specified messages.
		c.hub.unregister <- c

		ticker.Stop()
		_ = c.conn.Close()
	}()

	for {
		// See above; select from either of our two channels to read from.
		select {
		case message, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// The hub closed the channel; notify the client and exit this
				// goroutine.
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			err := c.conn.WriteMessage(websocket.TextMessage, message)
			if err != nil {
				log.Println("Got error trying to write message to peer:", err)
				return
			}

			// Since we just wrote to this WebSocket, we don't need to ping the peer
			// again. Reset the ticker so we don't prematurely trigger.
			//
			// XXX: This call was added in Go v1.15; Fedora 32 currently ships v1.14,
			// so we need to wait until Fedora 33 is stable and deployed on our servers
			// to use this command.
			//
			// ticker.Reset(pingPeriod)
		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

type socketHandlerRequest struct {
	GameID   uint64 `query:"id,omitempty" route:"GameID,omitempty"`
	UserID   uint64 `query:"user_id,omitempty" route:"UserID,omitempty"`
	APIToken string `json:"api_token,omitempty" header:"X-Auth-Token,omitempty" query:"api_token,omitempty"`
}

// SocketHandler is a handler for game connections
type SocketHandler struct {
	auth.Authed
	http.Handler

	Hub *Hub

	req socketHandlerRequest
	// No response object because this should be upgraded into a WebSocket
	// connection and shouldn't return a result itself.

	user *models.UserModel
}

func (handle *SocketHandler) GetObjectPointer() interface{} {
	return &handle.req
}

func (handle *SocketHandler) GetToken() string {
	return handle.req.APIToken
}

func (handle *SocketHandler) SetUser(user *models.UserModel) {
	handle.user = user
}

func (handle SocketHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	tx, err := database.GetTransaction()
	if err != nil {
		log.Println(err)
		hwaterr.WriteError(w, r, err)
		return
	}

	// Verify user
	if handle.req.UserID != handle.user.ID {
		err = hwaterr.WrapError(api_errors.ErrAccessDenied, http.StatusForbidden)
		log.Println(err)
		hwaterr.WriteError(w, r, err)
		return
	}

	// Verify game
	var gamedb models.GameModel
	err = gamedb.FromID(tx, handle.req.GameID)
	if err != nil {
		log.Println(err)
		hwaterr.WriteError(w, r, err)
		return
	}

	// Initialize the Websocket connection
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		hwaterr.WriteError(w, r, err)
		return
	}

	err = tx.Commit()
	if err != nil {
		log.Println(err)
		hwaterr.WriteError(w, r, err)
		return
	}

	log.Println("ServeHTTP - ", handle.Hub)

	// Create Client, Player
	client := &Client{hub: handle.Hub, conn: conn, send: make(chan []byte, 256)}

	// Connect Player to ActiveGame, Client to Hub
	handle.Hub.register <- client

	// Allow collection of memory referenced by the caller by doing all work in
	// new goroutines.
	go client.writePump()
	go client.readPump()
}
