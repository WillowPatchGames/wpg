package game

import (
	"errors"
	"log"
	"time"

	"github.com/gorilla/websocket"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
	"git.cipherboy.com/WillowPatchGames/wpg/internal/models"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/games"
)

type GameID uint64
type UserID uint64

const (
	// Time allowed to connect to the peer.
	connectWait = 16 * time.Second

	// Time allowed to write a message to the peer.
	writeWait = 8 * time.Second

	// Time allowed to read the next pong message from the peer.
	pongWait = 60 * time.Second

	// Send pings to peer with this period. Must be less than pongWait.
	pingPeriod = (pongWait * 1) / 4

	// ReadBufferSize must be limited in order to prevent the client from
	// starving resources from other players.
	readBufferSize = 256 * 1024 // 256KB

	// SendBufferSize must be limited because players could send messages which
	// result in large response messages, starving resources from other players.
	sendBufferSize = 256 * 1024 // 256KB
)

// Client holds the underlying websocket connection and the
type Client struct {
	// Pointer to our central Hub struct this client is registerred with.
	hub *Hub

	// Underlying client connection.
	conn *websocket.Conn

	// Buffered channel of outbound messages.
	send chan []byte

	// GameID this client is playing.
	gameID GameID

	// UserID this client is authicated as.
	userID UserID
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

	// Connections maps (gid, uid) tuples to an active Client connection. In the
	// future, this could be multiple connections to let the same player play on
	// different devices if they wish.
	connections map[GameID]map[UserID]*Client

	// dbgames maps gid to a loaded GameModel instance. In the future, some cache
	// invalidation should occur and we should figure out when to reload it from
	// the database.
	dbgames map[GameID]*models.GameModel

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
	return &Hub{
		connections: make(map[GameID]map[UserID]*Client),
		dbgames:     make(map[GameID]*models.GameModel),
		register:    make(chan *Client),
		unregister:  make(chan *Client),
		process:     make(map[GameID]chan ClientMessage),
	}
}

func (hub *Hub) ensureGameExists(gameid uint64) error {
	// If the game already exists, there's nothing we need to do. It is already
	// registerred in the controller and we can continue to adding a player.
	if hub.controller.GameExists(gameid) {
		return nil
	}

	tx, err := database.GetTransaction()
	if err != nil {
		return err
	}

	defer tx.Commit()

	var gamedb models.GameModel
	err = gamedb.FromID(tx, gameid)
	if err != nil {
		log.Println("Unable to load game:", err)
		return err
	}

	var config games.RushConfig
	err = gamedb.GetConfig(tx, &config)
	if err != nil {
		log.Println("Unable to load game config", err)
		return err
	}

	err = hub.controller.AddGame("rush", gameid, gamedb.OwnerID, config)
	if err != nil {
		log.Println("Unable to add game to controller:", err)
		return err
	}

	// Since we're creating this game, we need a way of processing messages from
	// clients. Each client has a single goroutine dedicated to reading or
	// writing from the client's WebSocket, but we also need a way of serializing
	// requests to hub.controller.Dispatch -- that's where ProcessGameMessages
	// comes into play. It takes requests from clients and turns them into
	// dispatches to the controller.
	hub.process[GameID(gameid)] = make(chan ClientMessage)
	go hub.ProcessGameMessages(GameID(gameid))

	return nil
}

func (hub *Hub) connectPlayer(client *Client) error {
	// Maybe the player exists in the client pool already. If so, all we need to
	// do is update the connection; everything else has already been done.
	// Otherwise, we've got to potentially create the game and add the player.

	user_client_map, present := hub.connections[client.gameID]
	if !present {
		// When
		hub.connections[client.gameID] = make(map[UserID]*Client)
		user_client_map = hub.connections[client.gameID]
	}

	player, present := user_client_map[client.userID]
	if present {
		if player != client {
			// If the player is already connected, assume this connection should take
			// precedence and update accordingly.
			hub.connections[client.gameID][client.userID] = client
		}

		return nil
	}

	// Create a new game if doesn't exist
	err := hub.ensureGameExists(uint64(client.gameID))
	if err != nil {
		return err
	}

	// The controller handles creating or resuming all of the player state
	// information.
	exists, err := hub.controller.AddPlayer(uint64(client.gameID), uint64(client.userID))
	if err != nil || exists {
		// If the player exists, err should be nil and so we'll return nil here;
		// there is nothing else we have to do here.
		return err
	}

	return nil
}

func (hub *Hub) registerClient(client *Client) {
	err := hub.connectPlayer(client)
	if err != nil {
		log.Println(err)
		return
	}
}

func (hub *Hub) deleteGame(gameID GameID) {
	delete(hub.connections, gameID)
	delete(hub.dbgames, gameID)
	delete(hub.process, gameID)

	err := hub.controller.RemoveGame(uint64(gameID))
	if err != nil {
		log.Println("Got unexpected error while removing game:", err)
	}
}

func (hub *Hub) deleteClient(client *Client) {
	if !hub.controller.GameExists(uint64(client.gameID)) {
		// Client can't possibly exist any more because the game is no longer
		// present. Remove the client without throwing an error and additionally
		// remove all other connections using the same gameID.
		hub.deleteGame(client.gameID)
		return
	}

	delete(hub.connections[client.gameID], client.userID)
	if len(hub.connections[client.gameID]) == 0 {
		hub.deleteGame(client.gameID)
	}

	if !hub.controller.PlayerExists(uint64(client.gameID), uint64(client.userID)) {
		return
	}

	close(client.send)
}

// Run only processes register/unregister messages. A separate goroutine
// running ProcessGameMessages handles messages for specific games.
func (hub *Hub) Run() {
	for {
		select {
		case new_client := <-hub.register:
			hub.registerClient(new_client)
		case existing_client := <-hub.unregister:
			hub.deleteClient(existing_client)
		}
	}
}

func (hub *Hub) processMessage(client *Client, message []byte) error {
	if !hub.controller.GameExists(uint64(client.gameID)) {
		hub.unregister <- client
		return errors.New("unable to process message for non-existent game")
	}

	if !hub.controller.PlayerExists(uint64(client.gameID), uint64(client.userID)) {
		hub.unregister <- client
		return errors.New("unable to process message from non-existent client")
	}

	return hub.controller.Dispatch(message)
}

func (hub *Hub) ProcessGameMessages(gid GameID) {
	for {
		channel, present := hub.process[gid]
		if !present {
			log.Println("No process channel for specified game:", gid)
			return
		}

		select {
		case news := <-channel:
			err := hub.processMessage(news.client, news.message)
			if err != nil {
				log.Println("Got error processing message:", err)
			}
		default:
			log.Println("Returning due to closed channel for specified game:", gid)
			return
		}
	}
}
