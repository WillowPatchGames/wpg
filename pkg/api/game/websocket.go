package game

import (
	"encoding/json"
	"errors"
	"fmt"
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

	err = hub.controller.AddGame("rush", gameid, config)
	if err != nil {
		log.Println("Unable to add game to controller:", err)
		return err
	}

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
	err := hub.ensureGameExists(client.gameID)
	if err != nil {
		return err
	}

	exists, err = hub.controller.AddPlayer(client.gameID, client.userID)
	if err != nil || exists {
		return err
	}

	tx, err := game.txs.GetTx()
	if err != nil {
		return nil, err
	}
	defer game.txs.ReleaseTx(tx)

	var userdb models.UserModel
	err = userdb.FromID(tx, userid)
	if err != nil {
		return nil, err
	}

	class := "pending"
	if userid == game.model.OwnerID {
		class = "player"
	}
	playerdb := models.PlayerModel{
		GameID: gameid,
		UserID: userid,
		Class:  class,
	}
	var state *PlayerState
	// Maybe the player exists in the database already
	err = playerdb.FromIDs(tx, gameid, userid)
	if err != nil {
		// Nope, let's create it
		err = playerdb.Create(tx)
		if err != nil {
			return nil, err
		}
		// And give it some state
		state = newPlayerState()
		err = playerdb.SetState(tx, &state)
		if err != nil {
			return nil, err
		}
	} else {
		// If it exists, maybe it has some state?
		err = playerdb.GetState(tx, &state)
		if err != nil {
			// Or give it some state
			state = newPlayerState()
			err = playerdb.SetState(tx, &state)
			if err != nil {
				// Nope it didn't like to get some state
				return nil, err
			}
		}
	}

	player = &ActivePlayer{
		model:  playerdb,
		user:   userdb,
		state:  state,
		game:   game,
		client: client,
	}

	game.players[userdb.ID] = player
	hub.clients[client] = player

	return player, nil
}

func (hub *Hub) getPlayer(client *Client) (*ActivePlayer, bool) {
	player, ok := hub.clients[client]
	if !ok {
		hub.sendErrToClient(client, "You are not playing this game.")
	}
	return player, ok
}

func (hub *Hub) deleteClient(client *Client) {
	player, present := hub.clients[client]
	if present {
		log.Println("Delete client " + player.user.Display)
		player.client = nil
		delete(hub.clients, client)
	}
	close(client.send)
}

func (hub *Hub) sendToClient(client *Client, message string) {
	select {
	case client.send <- []byte(message):
	default:
		hub.deleteClient(client)
	}
}

func (hub *Hub) sendJSONToClient(client *Client, data interface{}) {
	buf, err := json.Marshal(data)
	if err == nil {
		hub.sendToClient(client, string(buf))
	} else {
		fmt.Println(err)
	}
}

func (hub *Hub) sendErrToClient(client *Client, err string) {
	data := map[string]string{
		"type":    "error",
		"message": err,
	}
	hub.sendJSONToClient(client, data)
}

func (hub *Hub) sendErrToClientFor(client *Client, err string, req string) {
	data := map[string]string{
		"type":    "error",
		"message": err,
		"request": req,
	}
	hub.sendJSONToClient(client, data)
}

func (hub *Hub) sendToGame(game *ActiveGame, message string) {
	for _, player := range game.players {
		if player.client != nil {
			hub.sendToClient(player.client, message)
		}
	}
}

func (hub *Hub) sendJSONToGame(game *ActiveGame, data interface{}) {
	buf, err := json.Marshal(data)
	if err == nil {
		hub.sendToGame(game, string(buf))
	} else {
		fmt.Println(err)
	}
}

// Message is the umbrella JSON schema of fields and their types
type Message struct {
	Type       string         `json:"type"`
	Message    string         `json:"message,omitempty"`
	Letters    []Letter       `json:"letters,omitempty"`
	Letter     *Letter        `json:"letter,omitempty"`
	User       *JSONUser      `json:"user,omitempty"`
	Snapshot   []PlayerPlank  `json:"snapshot,omitempty"`
	Snapshots  []UserSnapshot `json:"snapshots,omitempty"`
	DrawNumber int            `json:"draw_number,omitempty"`
	Request    string         `json:"request,omitempty"`
}

// JSONUser is a JSON user entry
type JSONUser struct {
	Display string `json:"display"`
	ID      uint64 `json:"id"`
}

// UserSnapshot is a snapshot paired with its user
type UserSnapshot struct {
	User     JSONUser      `json:"user"`
	Snapshot []PlayerPlank `json:"snapshot"`
}

func (hub *Hub) actOn(client *Client, buf string) {
	var cmd Message
	err := json.Unmarshal([]byte(buf), &cmd)
	if err != nil {
		hub.sendErrToClient(client, err.Error())
		return
	}
	if player, ok := hub.getPlayer(client); ok {
		game := player.game

		if len(cmd.Snapshot) > 0 {
			player.state.Board = cmd.Snapshot
		}

		if cmd.Type == "draw" {
			if player.model.Class != "player" {
				hub.sendErrToClientFor(client, "Sorry, you cannot draw.", cmd.Request)
				return
			}
			if game.model.Lifecycle == "finished" {
				hub.sendErrToClientFor(client, "Game finished.", cmd.Request)
				return
			}
			if game.model.Lifecycle == "pending" {
				if len(game.state.Letters) >= game.config.StartSize*len(game.players) {
					game.state.DrawNumber = 2

					tx, err := game.txs.GetTx()
					if err != nil {
						log.Println(err)
						return
					}
					defer game.txs.ReleaseTx(tx)

					for _, p := range game.players {
						drawn := game.state.Letters[:game.config.StartSize]
						game.state.Letters = game.state.Letters[game.config.StartSize:]
						p.state.Letters = append(p.state.Letters, drawn...)
						err := p.model.SetState(tx, &p.state)
						if err != nil {
							log.Println(err)
							// no return
						}
						if p.client != nil {
							req := cmd.Request
							if p.user.ID != player.user.ID {
								req = ""
							}
							hub.sendJSONToClient(p.client, Message{Type: "gamestart", DrawNumber: 1, User: &JSONUser{player.user.Display, player.user.ID}, Letters: drawn, Request: req})
						}
					}
					err = game.model.SetState(tx, &game.state)
					if err != nil {
						log.Println(err)
						return
					}
					game.model.Lifecycle = "playing"
					err = game.model.Save(tx)
					if err != nil {
						log.Println(err)
						// no return
					}
				} else {
					tx, err := game.txs.GetTx()
					if err != nil {
						log.Println(err)
						return
					}
					defer game.txs.ReleaseTx(tx)

					game.model.Lifecycle = "finished"
					err = game.model.Save(tx)
					if err != nil {
						log.Println(err)
						// no return
					}
					hub.sendJSONToGame(game, Message{Type: "gameover", User: &JSONUser{player.user.Display, player.user.ID}})
				}
			} else {
				if len(game.state.Letters) >= game.config.DrawSize*len(game.players) {
					if cmd.DrawNumber != game.state.DrawNumber {
						hub.sendErrToClientFor(client, "Someone beat you to the draw.", cmd.Request)
						return
					}

					tx, err := game.txs.GetTx()
					if err != nil {
						log.Println(err)
						return
					}
					defer game.txs.ReleaseTx(tx)

					for i := range game.players {
						p := game.players[i]
						drawn := game.state.Letters[:game.config.DrawSize]
						game.state.Letters = game.state.Letters[game.config.DrawSize:]
						p.state.Letters = append(p.state.Letters, drawn...)
						err := p.model.SetState(tx, &p.state)
						if err != nil {
							log.Println(err)
							// no return
						}

						if p.client != nil {
							req := cmd.Request
							if p.user.ID != player.user.ID {
								req = ""
							}
							hub.sendJSONToClient(p.client, Message{Type: "draw", DrawNumber: cmd.DrawNumber, User: &JSONUser{player.user.Display, player.user.ID}, Letters: drawn, Request: req})
						}
					}
					game.state.DrawNumber++
					err = game.model.SetState(tx, &game.state)
					if err != nil {
						log.Println(err)
						return
					}
				} else {
					tx, err := game.txs.GetTx()
					if err != nil {
						log.Println(err)
						return
					}
					defer game.txs.ReleaseTx(tx)

					game.model.Lifecycle = "finished"
					err = game.model.Save(tx)
					if err != nil {
						log.Println(err)
						// no return
					}
					for _, participant := range game.players {
						err := participant.model.SetState(tx, participant.state)
						if err != nil {
							log.Println(err)
							// no return
						}
					}
					hub.sendJSONToGame(game, Message{Type: "gameover", User: &JSONUser{player.user.Display, player.user.ID}})
				}
			}
		} else if cmd.Type == "discard" {
			if player.model.Class != "player" {
				hub.sendErrToClientFor(client, "Sorry, you cannot discard.", cmd.Request)
				return
			}
			game := player.game
			if len(game.state.Letters) >= game.config.DiscardPenalty {
				found := -1
				for i := range player.state.Letters {
					if *cmd.Letter == player.state.Letters[i] {
						found = i
					}
				}
				if found == -1 {
					hub.sendErrToClientFor(client, "The letter was not assigned to you.", cmd.Request)
					return
				}
				player.state.Letters = append(player.state.Letters[:found], player.state.Letters[found+1:]...)
				letters := []Letter{}
				for i := 0; i < game.config.DiscardPenalty; i++ {
					l := game.state.nextLetter()
					letters = append(letters, l)
					player.state.Letters = append(player.state.Letters, l)
				}
				game.state.addLetter(*cmd.Letter)

				tx, err := game.txs.GetTx()
				if err != nil {
					log.Println(err)
					return
				}
				defer game.txs.ReleaseTx(tx)
				err = player.model.SetState(tx, &player.state)
				if err != nil {
					log.Println(err)
					return
				}

				err = game.model.SetState(tx, &game.state)
				if err != nil {
					log.Println(err)
					return
				}

				hub.sendJSONToClient(client, Message{
					Type:    "discard",
					Letters: letters,
					Letter:  cmd.Letter,
					Request: cmd.Request,
				})
			} else {
				hub.sendErrToClientFor(client, "There are not enough letters left!", cmd.Request)
			}
		} else if cmd.Type == "swap" {
		} else if cmd.Type == "admit" {
			if player, ok := hub.getPlayer(client); ok {
				game := player.game
				found := false
				for _, admitted := range game.players {
					if admitted.user.ID == cmd.User.ID {
						admitted.model.Class = "player"
						found = true
						tx, err := game.txs.GetTx()
						if err != nil {
							log.Println(err)
							return
						}
						defer game.txs.ReleaseTx(tx)
						err = player.model.Save(tx)
						if err != nil {
							log.Println(err)
							return
						}
						if admitted.client != nil {
							hub.sendJSONToClient(admitted.client, Message{Type: "admitted", Message: "You are admitted to the game. Please wait."})
						}
					}
				}
				if !found {
					hub.sendErrToClient(client, "Unknown user")
				}
			}
		} else if cmd.Type == "start" {
			if player, ok := hub.getPlayer(client); ok {
				game := player.game
				for _, player := range game.players {
					if player.client != nil {
						hub.sendJSONToClient(player.client, Message{Type: "started", Message: "The game is starting now!"})
					}
				}
			}
		} else if cmd.Type == "peek" {
			snapshots := make([]UserSnapshot, len(game.players))
			for _, player := range game.players {
				if player.state != nil {
					snapshots = append(snapshots, UserSnapshot{JSONUser{player.user.Display, player.user.ID}, player.state.Board})
				}
			}
			hub.sendJSONToClient(client, Message{
				Type:      "snapshots",
				Snapshots: snapshots,
				Request:   cmd.Request,
			})
		} else if cmd.Type != "snapshot" {
			hub.sendErrToClientFor(client, "Unrecognized message type: "+cmd.Type+".", cmd.Request)
		}
	} else {
		hub.sendErrToClientFor(client, "Sorry, who are you again?", cmd.Request)
	}
}

// Run runs fast
func (hub *Hub) Run() {
	for {
		select {
		case news := <-hub.register:
			hub.registerClient(news)
		case client := <-hub.unregister:
			hub.deleteClient(client)
		case news := <-hub.process:
			hub.actOn(news.client, news.message)
		}
	}
}

func (hub *Hub) registerClient(news *Client) {
	player, err := hub.connectPlayer(news.client, news.gameid, news.userid)
	if err != nil {
		log.Println(err)
		hub.sendErrToClient(news.client, err.Error())
		return
	}
	hub.sendJSONToClient(news.client, Message{Type: "message", Message: "HI"})
	game := player.game
	if game.model.Lifecycle == "pending" {
		if player.user.ID != game.model.OwnerID {
			hub.sendJSONToClient(news.client, Message{Type: "pending", Message: "You will be admitted to the game shortly."})
			admin, present := game.players[game.model.OwnerID]
			if present && player.model.Class == "pending" && admin.client != nil {
				hub.sendJSONToClient(admin.client, Message{Type: "invite", User: &JSONUser{player.user.Display, player.user.ID}})
			}
		} else {
			hub.sendJSONToClient(news.client, Message{Type: "admitted", Message: "Welcome, game admin!."})
		}
	} else if game.model.Lifecycle == "playing" {
		if player.model.Class == "player" {
			hub.sendJSONToClient(player.client, Message{Type: "started", Message: "The game started already!"})
			if len(player.state.Letters) > 0 {
				hub.sendJSONToClient(news.client, Message{Type: "gamestart", DrawNumber: game.state.DrawNumber - 1, Letters: player.state.Letters})
			}
		}
	}
	// TODO: send join notification to clients
}
