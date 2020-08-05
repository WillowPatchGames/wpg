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

	"git.cipherboy.com/WordCorp/api/internal/database"
	"git.cipherboy.com/WordCorp/api/internal/models"
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
	err = gamedb.FromId(tx, gameid)
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
		if hub.clients[c].model.GameId == gameid && hub.clients[c].model.UserId == userid {
			return nil, errors.New("Player was already connected with different connection")
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
		return nil, errors.New("Player was already connected with different connection")
	}

	// If not, and the game is finished, we don't want to add more players
	if game.model.Lifecycle == "finished" {
		return nil, errors.New("Cannot add player to finished game")
	}

	tx, err := game.txs.GetTx()
	if err != nil {
		return nil, err
	}
	defer game.txs.ReleaseTx(tx)

	var userdb models.UserModel
	err = userdb.FromId(tx, userid)
	if err != nil {
		return nil, err
	}

	class := "pending"
	if userid == game.model.OwnerId {
		class = "player"
	}
	playerdb := models.PlayerModel{
		GameId: gameid,
		UserId: userid,
		Class:  class,
	}
	var state *PlayerState
	// Maybe the player exists in the database already
	err = playerdb.FromIds(tx, gameid, userid)
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

	game.players[userdb.Id] = player
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

// MsgType struct contains a message type
type MsgType struct {
	Type string `json:"type"`
}

// MsgLetters for add/remove letter responses
type MsgLetters struct {
	Type    string   `json:"type"`
	Letters []Letter `json:"letters"`
}

// MsgMessage to send a message
type MsgMessage struct {
	Type    string `json:"type"`
	Message string `json:"message"`
}

// MsgDiscard for discard type messages
type MsgDiscard struct {
	Type   string `json:"type"`
	Letter Letter `json:"letter"`
}

// MsgUser for sending a message with a user
type MsgUser struct {
	Type string   `json:"type"`
	User JSONUser `json:"user"`
}

// JSONUser is a JSON user entry
type JSONUser struct {
	Display string `json:"display"`
	Id      uint64 `json:"id"`
}

// MsgAdmit to admit a user
type MsgAdmit struct {
	Type string `json:"type"`
	User uint64 `json:"user"`
}

type MsgSnapshot struct {
	Snapshot []PlayerPlank `json:"snapshot"`
}

type MsgPeek struct {
	Type      string         `json:"type"`
	Snapshots []UserSnapshot `json:"snapshots"`
}

type UserSnapshot struct {
	User     JSONUser      `json:"user"`
	Snapshot []PlayerPlank `json:"snapshot"`
}

func (hub *Hub) actOn(client *Client, buf string) {
	var cmd MsgType
	err := json.Unmarshal([]byte(buf), &cmd)
	if err != nil {
		hub.sendErrToClient(client, err.Error())
		return
	}
	if player, ok := hub.getPlayer(client); ok {
		game := player.game

		var snapshot MsgSnapshot
		err = json.Unmarshal([]byte(buf), &snapshot)
		if err == nil && len(snapshot.Snapshot) > 0 {
			player.state.Board = snapshot.Snapshot
		}

		if cmd.Type == "draw" {
			if player.model.Class != "player" {
				hub.sendErrToClient(client, "Sorry, you cannot draw.")
				return
			}
			if game.model.Lifecycle == "finished" {
				hub.sendErrToClient(client, "Game finished.")
				return
			}
			if game.model.Lifecycle == "pending" {
				if len(game.state.Letters) >= game.config.StartSize*len(game.players) {
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
							hub.sendJSONToClient(p.client, MsgLetters{"add", drawn})
							hub.sendJSONToClient(p.client, MsgUser{"gamestart", JSONUser{player.user.Display, player.user.Eid}})
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
					hub.sendJSONToGame(game, MsgUser{"gameover", JSONUser{player.user.Display, player.user.Eid}})
				}
			} else {
				if len(game.state.Letters) >= game.config.DrawSize*len(game.players) {
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
							hub.sendJSONToClient(p.client, MsgLetters{"add", drawn})
							hub.sendJSONToClient(p.client, MsgUser{"draw", JSONUser{player.user.Display, player.user.Eid}})
						}
					}
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
					hub.sendJSONToGame(game, MsgUser{"gameover", JSONUser{player.user.Display, player.user.Eid}})
				}
			}
		} else if cmd.Type == "discard" {
			if player.model.Class != "player" {
				hub.sendErrToClient(client, "Sorry, you cannot discard.")
				return
			}
			game := player.game
			if len(game.state.Letters) >= game.config.DiscardPenalty {
				var msg MsgDiscard
				err := json.Unmarshal([]byte(buf), &msg)
				if err != nil {
					hub.sendErrToClient(client, err.Error())
					return
				}
				found := -1
				for i := range player.state.Letters {
					if msg.Letter == player.state.Letters[i] {
						found = i
					}
				}
				if found == -1 {
					hub.sendErrToClient(client, "The letter was not assigned to you.")
					return
				}
				player.state.Letters = append(player.state.Letters[:found], player.state.Letters[found+1:]...)
				letters := []Letter{}
				for i := 0; i < game.config.DiscardPenalty; i++ {
					l := game.state.nextLetter()
					letters = append(letters, l)
					player.state.Letters = append(player.state.Letters, l)
				}
				game.state.addLetter(msg.Letter)

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

				hub.sendJSONToClient(client, MsgLetters{"delete", []Letter{msg.Letter}})
				hub.sendJSONToClient(client, MsgLetters{"add", letters})
			} else {
				hub.sendErrToClient(client, "There are not enough letters left!")
			}
		} else if cmd.Type == "swap" {
		} else if cmd.Type == "admit" {
			var msg MsgAdmit
			err := json.Unmarshal([]byte(buf), &msg)
			if err != nil {
				hub.sendErrToClient(client, err.Error())
				return
			}

			if player, ok := hub.getPlayer(client); ok {
				game := player.game
				found := false
				for _, admitted := range game.players {
					if admitted.user.Eid == msg.User {
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
							hub.sendJSONToClient(admitted.client, MsgMessage{"admitted", "You are admitted to the game. Please wait."})
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
						hub.sendJSONToClient(player.client, MsgMessage{"started", "The game is starting now!"})
					}
				}
			}
		} else if cmd.Type == "peek" {
			snapshots := make([]UserSnapshot, len(game.players))
			for _, player := range game.players {
				if player.state != nil {
					snapshots = append(snapshots, UserSnapshot{JSONUser{player.user.Display, player.user.Eid}, player.state.Board})
				}
			}
			hub.sendJSONToClient(client, MsgPeek{"snapshots", snapshots})
		} else if cmd.Type != "snapshot" {
			hub.sendErrToClient(client, "Unrecognized message type: "+cmd.Type+".")
		}
	} else {
		hub.sendErrToClient(client, "Sorry, who are you again?")
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
	hub.sendJSONToClient(news.client, MsgMessage{"message", "HI"})
	game := player.game
	if player.user.Id != game.model.OwnerId {
		hub.sendJSONToClient(news.client, MsgMessage{"pending", "You will be admitted to the game shortly."})
		admin, present := game.players[game.model.OwnerId]
		if present && player.model.Class == "pending" && admin.client != nil {
			hub.sendJSONToClient(admin.client, MsgUser{"invite", JSONUser{player.user.Display, player.user.Eid}})
		}
	} else {
		hub.sendJSONToClient(news.client, MsgMessage{"admitted", "Welcome, game admin!."})
	}
	// TODO: send join notification to clients
}
