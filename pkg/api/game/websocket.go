// Copyright 2013 The Gorilla WebSocket Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package game

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"sync"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
	"git.cipherboy.com/WillowPatchGames/wpg/internal/models"
)

// Hub maintains the set of active clients and broadcasts messages to the
// clients.
type Hub struct {
	// Registered clients.
	clients map[*Client]*ActivePlayer

	// A map of active games by id
	games map[uint64]*ActiveGame

	// Register requests from the clients.
	register chan ClientRegister

	// Unregister requests from clients.
	unregister chan *Client

	process chan ClientMessage
}

// NewHub news hubs
func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]*ActivePlayer),
		games:      make(map[uint64]*ActiveGame),
		register:   make(chan ClientRegister),
		unregister: make(chan *Client),
		process:    make(chan ClientMessage),
	}
}

// ActiveGame information
type ActiveGame struct {
	model   models.GameModel
	config  RushGameConfig
	state   *GameState
	players map[uint64]*ActivePlayer
	txs     GameTxs
}

// ActivePlayer state
type ActivePlayer struct {
	model  models.PlayerModel
	user   models.UserModel
	state  *PlayerState
	game   *ActiveGame
	client *Client
}

// A Letter with a uuid
type Letter struct {
	ID    int32  `json:"id"`
	Value string `json:"value"`
}

type GameTxs struct {
	lock sync.Mutex
}

func (g *GameTxs) GetTx() (*sql.Tx, error) {
	g.lock.Lock()

	tx, err := database.GetTransaction()
	if err != nil {
		g.lock.Unlock()
	}

	return tx, err
}

func (g *GameTxs) ReleaseTx(tx *sql.Tx) {
	if tx != nil {
		err := tx.Commit()
		if err != nil && err != sql.ErrTxDone {
			log.Println(err)
		}
	}

	g.lock.Unlock()
}

func (hub *Hub) connectGame(gameid uint64) (*ActiveGame, error) {
	game, present := hub.games[gameid]
	if present {
		return game, nil
	}

	game = new(ActiveGame)

	tx, err := game.txs.GetTx()
	if err != nil {
		return nil, err
	}
	defer game.txs.ReleaseTx(tx)

	var gamedb models.GameModel
	err = gamedb.FromID(tx, gameid)
	if err != nil {
		log.Println(err)
		return nil, err
	}

	err = gamedb.GetConfig(tx, &game.config)
	if err != nil {
		return nil, err
	}

	err = game.loadOrStart(tx, gamedb)
	if err != nil {
		return nil, err
	}

	game.model = gamedb
	game.players = make(map[uint64]*ActivePlayer)
	hub.games[gameid] = game
	return game, nil
}

// TODO: actually have a start event!
func (game *ActiveGame) loadOrStart(tx *sql.Tx, gamedb models.GameModel) error {
	// state TEXT DEFAULT '{}'
	err := gamedb.GetState(tx, &game.state)
	if err != nil {
		return err
	}

	if game.state.Initialized {
		return nil
	}

	tilepile := game.config.NumTiles
	if game.config.TilesPerPlayer {
		tilepile *= game.config.NumPlayers
	}

	game.state = newGameState(tilepile)
	err = gamedb.SetState(tx, &game.state)
	return err
}

func (hub *Hub) connectPlayer(client *Client, gameid uint64, userid uint64) (*ActivePlayer, error) {
	// Maybe the player exists in the client pool already
	player, present := hub.clients[client]
	if present {
		return player, nil
	}

	// Make sure the player doesn't already have another client connection
	for c := range hub.clients {
		if hub.clients[c].model.GameID == gameid && hub.clients[c].model.UserID == userid {
			return nil, errors.New("player was already connected with different connection")
		}
	}

	game, err := hub.connectGame(gameid)
	if err != nil {
		return nil, err
	}

	// Maybe the player exists in the game already
	player, present = game.players[userid]
	if present {
		if player.client == nil {
			player.client = client
			hub.clients[client] = player
			return player, nil
		}
		return nil, errors.New("player was already connected with different connection")
	}

	// If not, and the game is finished, we don't want to add more players
	if game.model.Lifecycle == "finished" {
		return nil, errors.New("cannot add player to finished game")
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

func (hub *Hub) registerClient(news ClientRegister) {
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
