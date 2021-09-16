package game

import (
	"encoding/json"
	"errors"
	"log"
	"strconv"
	"time"

	"gorm.io/gorm"

	"github.com/gorilla/websocket"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/games"
)

type GameID uint64
type UserID uint64
type SessionID uint64

const (
	// Time allowed to connect to the peer.
	connectWait = 16 * time.Second

	// Time allowed to write a message to the peer.
	writeWait = 8 * time.Second

	// Time allowed to read the next pong message from the peer.
	pongWait = 60 * time.Second

	// Send pings to peer with this period. Must be less than pongWait.
	pingPeriod = (pongWait * 1) / 128

	// Waiting period for notification channel to be created.
	notificationCreateWaitPeriod = 1 * time.Second

	// ReadBufferSize must be limited in order to prevent the client from
	// starving resources from other players.
	readBufferSize = 16 * 1024 // 16KB

	// readRateLimitPerSecond is the maximum number of requests from a client
	// in a given 1-second window.
	readRateLimitPerSecond = 30

	// SendBufferSize must be limited because players could send messages which
	// result in large response messages, starving resources from other players.
	sendBufferSize = 16 * 1024 // 16KB

	// Register and unregister channel buffer size
	registerChannelSize = 32

	// Inbound messages channel buffer size
	messageChannelSize = 32 * 512

	// Timeout between database persistance operations
	databasePersistDuration = 10 * time.Second

	// Timeout between game save operations
	gamePersistWaitDuration = 10 * time.Millisecond
)

// Client holds the underlying websocket connection and the
type Client struct {
	// Pointer to our central Hub struct this client is registerred with.
	hub *Hub

	// Underlying client connection.
	conn *websocket.Conn

	// Buffered channel of outbound messages.
	send chan interface{}

	// GameID this client is playing.
	gameID GameID

	// UserID this client is authicated as.
	userID UserID

	// SessionID associated with this client. This allows each user to have
	// multiple (mirrored) sessions open at the same time.
	sessionID SessionID
}

// upgrader takes a regular net/http connection and upgrades it into a
// WebSocket connection.
var upgrader = websocket.Upgrader{
	HandshakeTimeout: connectWait,
	ReadBufferSize:   readBufferSize,
	WriteBufferSize:  sendBufferSize,
}

func (c *Client) String() string {
	return "user:" + strconv.FormatUint(uint64(c.userID), 10) + "[session:" + strconv.FormatUint(uint64(c.sessionID), 10) + "]" + "@game:" + strconv.FormatUint(uint64(c.gameID), 10)
}

func (c *Client) isActive() bool {
	// Validate that our client connection is still good.
	game_conns, ok := c.hub.connections[c.gameID]
	if !ok {
		// Game was deleted under us.
		return false
	}

	user_sessions, ok := game_conns[c.userID]
	if !ok {
		// All of this user's sessions were deleted under us. Likely a server
		// restart.
		return false
	}

	connection, ok := user_sessions[c.sessionID]
	if !ok || connection != c {
		// This session was removed and/or (dangerously!!!) the client reused the
		// session id (most likely a zero id from a non-upgraded client).
		return false
	}

	return true
}

// client.readPump() pumps messages from the websocket connection to the hub.
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

	// We need some mechanism here for rate limiting requests from the client.
	// Notably, we only rate-limit inbound messages: we assume our server
	// generates a reasonable amount of traffic for a single inbound message.
	// While this can be disproportionate (e.g., if it is your turn to play
	// in a multi-player synchronous game -- causing everyone else's state to
	// update), we assume 1. Players wish to be in this game (and hence, it is
	// a self DoS and 2. A rogue party can't always send this type of traffic
	// in general.
	//
	// So how do we rate limit? Ingeniously we only need two variables: the
	// time of the last request, and the number of requests received in the
	// last second. If the last request was received more than a second ago,
	// we can reset the number of requests to 1. Otherwise, we increment the
	// counter.
	//
	// Since we assume readPump(...) is run in its own goroutine, if we hit
	// the limit, we can simply sleep a second and wait for our problems to
	// go away. :-)

	var last_request int64
	var num_requests = 0

	for {
		if !c.isActive() {
			log.Println("Closing stale readPump() for", c.String())
			return
		}

		// Set the deadline on the read command below.
		_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))

		messageType, message, err := c.conn.ReadMessage()
		if err != nil {
			log.Println("Got an error during reading?", err, c.String())
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Println("Got unepected close error:", err, c.String())
			}
			return
		}

		if messageType != websocket.TextMessage {
			log.Println("Unexpected message type: "+strconv.Itoa(messageType)+" -- proceeding anyways", c.String())
		}

		c.hub.process[c.gameID] <- ClientMessage{c, message}

		// Now rate limit.
		var now = time.Now().Unix()
		if last_request == now {
			num_requests += 1
		} else {
			num_requests = 1
			last_request = now
		}

		if num_requests >= readRateLimitPerSecond {
			log.Println("Overactive client needs to be rate-limited:", c.String())
			time.Sleep(1 * time.Second)
		}
	}
}

// client.writePump() pumps messages from the hub to the websocket connection.
//
// A goroutine running writePump is started for each connection. The
// application ensures that there is at most one writer to a connection by
// executing all writes from this goroutine.
func (c *Client) writePump() {
	// In order to keep this WebSocket connection open, we have to send ping
	// messages from the server to the client every so often. This period is
	// determined by the pingPeriod constant. Create a ticker so we can be
	// notified when we need to send a new ping message.
	//
	// However, until the outbound send channel is present, default to waiting
	// notificationCreateWaitPeriod -- this lets us exit the select and check if
	// the channel exists.
	ticker := time.NewTicker(notificationCreateWaitPeriod)

	defer func() {
		// If we can no longer write to the client, we should consider the client
		// closed and unregister it from the hub. In the worst case, a new
		// connection will appear with the specified messages.
		c.hub.unregister <- c

		ticker.Stop()
		_ = c.conn.Close()
	}()

	var empty chan interface{} = make(chan interface{})

	for {
		var c_send chan interface{}
		if c.send == nil {
			c_send = empty
			ticker = time.NewTicker(notificationCreateWaitPeriod)
		} else {
			c_send = c.send
			ticker = time.NewTicker(pingPeriod)
		}

		if !c.isActive() {
			log.Println("Closing stale writePump() for", c.String())
			return
		}

		// See above; select from either of our two channels to read from.
		select {
		case message, ok := <-c_send:
			if !c.isActive() {
				c_send <- message
				log.Println("Closing stale writePump() after message read for", c.String())
				return
			}

			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// The hub closed the channel; notify the client and exit this
				// goroutine.
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			message_data, err := json.Marshal(message)
			if err != nil {
				log.Println("Got error trying to marshal to peer:", err, c.String())

				// We need to continue with the read/write pump in case we get future
				// messages. We shouldn't treat this as fatal, unlike when the actual
				// send fails.
				break
			}

			err = c.conn.WriteMessage(websocket.TextMessage, message_data)
			if err != nil {
				// Since we got _some_ message, we know we've had a non-empty channel
				// so stash this message to re-send to the client if/when they
				// reconnect. We're returning here too so we'll deregister and some
				// other client will take our place.
				c_send <- message
				log.Println("Got error writing message to client:", c.String())
				return
			}

			// Try to ping the client to keep the WebSocket alive. This will allow
			// us to try to keep the connection alive.
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				log.Println("Got error writing ping message to client:", c.String())
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
				log.Println("Got error writing ping message to client:", c.String())
				return
			}
		}
	}
}

// ClientMessage holds messages from clients
type ClientMessage struct {
	client *Client

	message []byte
}

// Hub maintains the mapping between WebSocket channels and the backend game
// controller. Note that a hub has a single games.Controller instance that
// tracks the data for all
type Hub struct {
	// Controller handles dispatching game-specific messages and keeping track of
	// game state.
	controller games.Controller

	// Connections maps (gid, uid, sid) tuples to an active Client connection.
	connections map[GameID]map[UserID]map[SessionID]*Client

	// dbgames maps gid to a loaded GameModel instance. In the future, some cache
	// invalidation should occur and we should figure out when to reload it from
	// the database.
	dbgames map[GameID]*database.Game

	// Register handles join requests from the clients.
	register chan *Client

	// Unregister handles drop requests from the clients.
	unregister chan *Client

	// Process a message from the client.
	process map[GameID]chan ClientMessage
}

// NewHub creates a new hub.
func NewHub() *Hub {
	// Note that inner maps and channels must be created per-game.
	var ret = new(Hub)
	ret.connections = make(map[GameID]map[UserID]map[SessionID]*Client)
	ret.dbgames = make(map[GameID]*database.Game)
	ret.register = make(chan *Client, registerChannelSize)
	ret.unregister = make(chan *Client, registerChannelSize)
	ret.process = make(map[GameID]chan ClientMessage)

	ret.controller.Init()

	return ret
}

func (hub *Hub) ensureGameExists(gameid uint64) error {
	// If the game already exists, there's nothing we need to do. It is already
	// registerred in the controller and we can continue to adding a player.
	if hub.controller.GameExists(gameid) {
		return nil
	}

	var gamedb database.Game

	if err := database.InTransaction(func(tx *gorm.DB) error {
		if err := tx.First(&gamedb, gameid).Error; err != nil {
			return err
		}

		// Save it to let others re-use the object.
		hub.dbgames[GameID(gameid)] = &gamedb

		return hub.controller.LoadGame(&gamedb)
	}); err != nil {
		return err
	}

	// Since we're creating this game, we need a way of processing messages from
	// clients. Each client has a single goroutine dedicated to reading or
	// writing from the client's WebSocket, but we also need a way of serializing
	// requests to hub.controller.Dispatch -- that's where ProcessPlayerMessages
	// comes into play. It takes requests from clients and turns them into
	// dispatches to the controller.
	hub.process[GameID(gameid)] = make(chan ClientMessage, messageChannelSize)

	log.Println("Spawning ProcessPlayerMessages for ", gameid)
	go hub.ProcessPlayerMessages(GameID(gameid))

	return nil
}

func (hub *Hub) connectPlayer(client *Client) error {
	// Maybe the player exists in the client pool already. If so, all we need to
	// do is update the connection; everything else has already been done.
	// Otherwise, we've got to potentially create the game and add the player.

	user_client_map, present := hub.connections[client.gameID]
	if !present {
		// When
		hub.connections[client.gameID] = make(map[UserID]map[SessionID]*Client)
		user_client_map = hub.connections[client.gameID]
	}

	player_connections, present := user_client_map[client.userID]
	if present {
		session_client, present := player_connections[client.sessionID]
		if present && session_client != client {
			// If the player is already connected, assume this connection should take
			// precedence and update accordingly -- but this is dangerous (!!!)
			// because the client is reusing session identifiers (most likely due to
			// an older client that isn't yet updated to support session IDs).
			hub.connections[client.gameID][client.userID][client.sessionID] = client
			return nil
		}

		// If this player is already present (hence the above present conditional)
		// but this session ID isn't present, it is the "same" player, just
		// another connection -- but we still need to go into the controller to
		// add the Notification channel. Hence why we don't return from this branch.
	} else {
		user_client_map[client.userID] = make(map[SessionID]*Client)
	}

	// Create a new game if doesn't exist.
	err := hub.ensureGameExists(uint64(client.gameID))
	if err != nil {
		return err
	}

	// Load the player from the database to see whether or not they've been
	// admitted already.
	var game_player database.GamePlayer
	if err = database.InTransaction(func(tx *gorm.DB) error {
		return tx.First(&game_player, "user_id = ? AND game_id = ?", client.userID, client.gameID).Error
	}); err != nil {
		return err
	}

	// The controller handles creating or resuming all of the player state
	// information.
	_, err = hub.controller.AddPlayer(uint64(client.gameID), uint64(client.userID), uint64(client.sessionID), game_player.Admitted)
	if err != nil {
		return err
	}

	hub.connections[client.gameID][client.userID][client.sessionID] = client
	client.send, err = hub.controller.Undispatch(uint64(client.gameID), uint64(client.userID), uint64(client.sessionID))
	return err
}

func (hub *Hub) registerClient(client *Client) {
	err := hub.connectPlayer(client)
	if err != nil {
		log.Println(err)
		return
	}

	// Allow concurrent reading and writing from the peer only after the
	// register message has been processed. This is beacuse readPump and
	// writePump validate that they're the currently active client. If we start
	// them in SocketHandler like we used to, they'll exit prematurely because
	// their not the currently active client.
	go client.writePump()
	go client.readPump()
}

func (hub *Hub) deleteGame(gameID GameID) {

	if err := database.InTransaction(func(tx *gorm.DB) error {
		var gamedb database.Game
		if err := tx.First(&gamedb, uint64(gameID)).Error; err != nil {
			return err
		}

		return hub.controller.PersistGame(&gamedb, tx)
	}); err != nil {
		log.Println("Unable to persist game (", gameID, "):", err)
		return
	}

	delete(hub.connections, gameID)
	delete(hub.dbgames, gameID)
	delete(hub.process, gameID)

	if err := hub.controller.RemoveGame(uint64(gameID)); err != nil {
		log.Println("Got unexpected error while removing game:", err)
	}
}

func (hub *Hub) deleteClient(client *Client) {
	// XXX: Implement correctly. We can't actually remove players from the
	// game controller until the game has either finished or expired. That way,
	// if they rejoin they reuse their existing session content.

	if !hub.controller.GameExists(uint64(client.gameID)) {
		// Client can't possibly exist any more because the game is no longer
		// present. This means the game is already deleted and the player's
		// connection is closed. Don't do anything else. See notes below on
		// why this is possible.
		return
	}

	var deleteGame bool = false

	if hub.connections[client.gameID][client.userID][client.sessionID] != client {
		// Only remove the client if they're actually the ones playing. Otherwise
		// we risk disrupting some other connection of the client's.
		return
	}

	delete(hub.connections[client.gameID][client.userID], client.sessionID)
	if len(hub.connections[client.gameID][client.userID]) == 0 {
		// Only delete the user if this was the last session.
		delete(hub.connections[client.gameID], client.userID)
	}

	if len(hub.connections[client.gameID]) == 0 {
		// Hold off on doing the delete; see notes below.
		deleteGame = true
	}

	// Check if player exists on controller before deleting game; otherwise,
	// we won't close the underlying Channel.
	if !hub.controller.PlayerExists(uint64(client.gameID), uint64(client.userID)) {
		// We get here because, while the below code removes references to the
		// client in the Hub, there's no way to remove existing Goroutines with
		// a copy of the Client. In particular, routines like
		// ProcessPlayerMessages(...) can frequently be stuck holding a
		// client connection while it is being removed elsewhere.
		return
	}

	// Notify the game controller that the player left, so we quit trying to
	// process messages for them.
	hub.controller.PlayerLeft(uint64(client.gameID), uint64(client.userID), uint64(client.sessionID))

	if deleteGame {
		hub.deleteGame(client.gameID)
	}
}

// Run only processes register/unregister messages. A separate goroutine
// running ProcessPlayerMessages handles messages for specific games.
func (hub *Hub) Run() {
	go hub.PersistGames()

	for {
		select {
		case new_client := <-hub.register:
			log.Println("registerClient:", new_client.String())
			hub.registerClient(new_client)
		case existing_client := <-hub.unregister:
			log.Println("deleteClient:", existing_client.String())
			hub.deleteClient(existing_client)
		}
	}
}

func (hub *Hub) PersistGames() {
	for {
		var between_runs *time.Timer = time.NewTimer(databasePersistDuration)
		<-between_runs.C

		for gameid := range hub.controller.ToGame {
			var between_games *time.Timer = time.NewTimer(gamePersistWaitDuration)
			<-between_games.C

			if !hub.controller.GameExists(gameid) {
				// Skip this game for now.
				continue
			}

			if err := database.InTransaction(func(tx *gorm.DB) error {
				if model, ok := hub.dbgames[GameID(gameid)]; !ok || model == nil {
					var gamedb database.Game
					if err := tx.First(&gamedb, gameid).Error; err != nil {
						return err
					}

					hub.dbgames[GameID(gameid)] = &gamedb
				}

				if err := hub.controller.PersistGame(hub.dbgames[GameID(gameid)], tx); err != nil {
					return err
				}

				return tx.Save(hub.dbgames[GameID(gameid)]).Error
			}); err != nil {
				log.Println("Unable to persist game (", gameid, "):", err)
				continue
			}
		}
	}
}

func (hub *Hub) processMessage(client *Client, message []byte) error {
	if !hub.controller.GameExists(uint64(client.gameID)) {
		hub.unregister <- client
		return errors.New("unable to process message for non-existent game:" + client.String())
	}

	if !hub.controller.PlayerExists(uint64(client.gameID), uint64(client.userID)) {
		hub.unregister <- client
		return errors.New("unable to process message from non-existent client:" + client.String())
	}

	changed_state, err := hub.controller.Dispatch(message, uint64(client.gameID), uint64(client.userID))
	if err != nil {
		log.Println("Got error processing message:", err, string(message))
	}

	if changed_state {
		gameid := uint64(client.gameID)
		if err := database.InTransaction(func(tx *gorm.DB) error {
			if model, ok := hub.dbgames[GameID(gameid)]; !ok || model == nil {
				var gamedb database.Game
				if err := tx.First(&gamedb, gameid).Error; err != nil {
					return err
				}

				hub.dbgames[GameID(gameid)] = &gamedb
			}

			if err := hub.controller.PersistGame(hub.dbgames[GameID(gameid)], tx); err != nil {
				return err
			}

			return tx.Save(hub.dbgames[GameID(gameid)]).Error
		}); err != nil {
			log.Println("Unable to persist game (", gameid, "):", err)
		}
	}

	return err
}

func (hub *Hub) ProcessPlayerMessages(gid GameID) {
	ticker := time.NewTicker(pongWait)
	defer ticker.Stop()

	for {
		channel, present := hub.process[gid]
		if !present {
			log.Println("No process channel for specified game:", gid)
			return
		}

		select {
		case news := <-channel:
			_ = hub.processMessage(news.client, news.message)
		case <-ticker.C:
			// Don't do anything; this ensures we check hub.process above in case
			// the socket was closed under us.
		}
	}
}
