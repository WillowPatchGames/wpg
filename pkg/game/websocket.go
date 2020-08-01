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
			return player, nil
		} else {
			return nil, errors.New("Player was already connected with different connection")
		}
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

func (h *Hub) getPlayer(client *Client) (*ActivePlayer, bool) {
	player, ok := h.clients[client]
	if !ok {
		h.sendErrToClient(client, "You are not playing this game.")
	}
	return player, ok
}

func (h *Hub) deleteClient(client *Client) {
	player, present := h.clients[client]
	if present {
		player.client = nil
		delete(h.clients, client)
	}
	close(client.send)
}

func (h *Hub) sendToClient(client *Client, message string) {
	select {
	case client.send <- []byte(message):
	default:
		h.deleteClient(client)
	}
}

func (h *Hub) sendJSONToClient(client *Client, data interface{}) {
	buf, err := json.Marshal(data)
	if err == nil {
		h.sendToClient(client, string(buf))
	} else {
		fmt.Println(err)
	}
}

func (h *Hub) sendErrToClient(client *Client, err string) {
	data := map[string]string{
		"error": err,
	}
	h.sendJSONToClient(client, data)
}

func (h *Hub) sendToGame(game *ActiveGame, message string) {
	for _, player := range game.players {
		if player.client != nil {
			h.sendToClient(player.client, message)
		}
	}
}

func (h *Hub) sendJSONToGame(game *ActiveGame, data interface{}) {
	buf, err := json.Marshal(data)
	if err == nil {
		h.sendToGame(game, string(buf))
	} else {
		fmt.Println(err)
	}
}

// Msg struct contains a message and some data
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

// MsgInvite for admining users
type MsgInvite struct {
	Type   string `json:"type"`
	User MsgUser `json:"user"`
}

type MsgUser struct {
	Name string `json:"name"`
	Id uint64 `json:"id"`
}

type MsgAdmit struct {
	Type string `json:"type"`
	User uint64 `json:"user"`
}

func (h *Hub) actOn(client *Client, buf string) {
	var cmd MsgType
	err := json.Unmarshal([]byte(buf), &cmd)
	if err != nil {
		h.sendErrToClient(client, err.Error())
		return
	}
	if cmd.Type == "draw" {
		if player, ok := h.getPlayer(client); ok {
			if player.model.Class != "player" {
				h.sendErrToClient(client, "Sorry, you cannot draw.")
				return
			}
			game := player.game
			if game.model.Lifecycle == "finished" {
				h.sendErrToClient(client, "Game finished.")
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

					for i := range game.players {
						p := game.players[i]
						drawn := game.state.Letters[:game.config.StartSize]
						game.state.Letters = game.state.Letters[game.config.StartSize:]
						p.state.Letters = append(p.state.Letters, drawn...)
						err := p.model.SetState(tx, &p.state)
						if err != nil {
							log.Println(err)
							// no return
						}
						if p.client != nil {
							h.sendJSONToClient(p.client, MsgLetters{"add", drawn})
							if p.client == client {
								h.sendJSONToClient(p.client, MsgMessage{"gamestart", "You drew first!"})
							} else {
								h.sendJSONToClient(p.client, MsgMessage{"gamestart", player.user.Display + " drew first!"})
							}
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
					message := "Player " + player.user.Display + " won"
					h.sendJSONToGame(game, MsgMessage{"gameover", message})
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
							h.sendJSONToClient(p.client, MsgLetters{"add", drawn})
							if p.client == client {
								h.sendJSONToClient(p.client, MsgMessage{"draw", "You drew!"})
							} else {
								h.sendJSONToClient(p.client, MsgMessage{"draw", player.user.Display + " drew!"})
							}
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
					message := "Player " + player.user.Display + " won"
					h.sendJSONToGame(game, MsgMessage{"gameover", message})
				}
			}
		}
	} else if cmd.Type == "discard" {
		if player, ok := h.getPlayer(client); ok {
			if player.model.Class != "player" {
				h.sendErrToClient(client, "Sorry, you cannot discard.")
				return
			}
			game := player.game
			if len(game.state.Letters) >= game.config.DiscardPenalty {
				var msg MsgDiscard
				err := json.Unmarshal([]byte(buf), &msg)
				if err != nil {
					h.sendErrToClient(client, err.Error())
					return
				}
				found := -1
				for i := range player.state.Letters {
					if msg.Letter == player.state.Letters[i] {
						found = i
					}
				}
				if found == -1 {
					h.sendErrToClient(client, "The letter was not assigned to you.")
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

				h.sendJSONToClient(client, MsgLetters{"delete", []Letter{msg.Letter}})
				h.sendJSONToClient(client, MsgLetters{"add", letters})
			} else {
				h.sendErrToClient(client, "There are not enough letters left!")
			}
		}
	} else if cmd.Type == "swap" {
	} else if cmd.Type == "admit" {
		var msg MsgAdmit
		err := json.Unmarshal([]byte(buf), &msg)
		if err != nil {
			h.sendErrToClient(client, err.Error())
			return
		}

		if player, ok := h.getPlayer(client); ok {
			game := player.game
			admitted, ok := game.players[msg.User]
			if ok {
				admitted.model.Class = "player"
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
					h.sendJSONToClient(admitted.client, MsgMessage{"admitted", "You are admitted to the game. Please wait."})
				}
			} else {
				h.sendErrToClient(client, "Unknown user")
			}
		}
	} else if cmd.Type == "start" {
		if player, ok := h.getPlayer(client); ok {
			game := player.game
			for _, player := range game.players {
				if player.client != nil {
					h.sendJSONToClient(player.client, MsgMessage{"started", "The game is starting now!"})
				}
			}
		}
	} else {
		h.sendErrToClient(client, "Unrecognized message type: "+cmd.Type+".")
	}
}

// Run runs fast
func (h *Hub) Run() {
	for {
		select {
		case news := <-h.register:
			h.registerClient(news)
		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				h.deleteClient(client)
			}
		case news := <-h.process:
			h.actOn(news.client, news.message)
		}
	}
}

func (h *Hub) registerClient(news ClientRegister) {
	player, err := h.connectPlayer(news.client, news.gameid, news.userid)
	if err != nil {
		log.Println(err)
		h.sendErrToClient(news.client, err.Error())
		return
	}
	h.sendJSONToClient(news.client, MsgMessage{"message", "HI"})
	game := player.game
	if player.user.Id != game.model.OwnerId {
		h.sendJSONToClient(news.client, MsgMessage{"pending", "You will be admitted to the game shortly."})
		admin, present := game.players[game.model.OwnerId]
		if present && player.model.Class == "pending" && admin.client != nil {
			h.sendJSONToClient(admin.client, MsgInvite{"invite", MsgUser{player.user.Display, player.user.Id}})
		}
	} else {
		h.sendJSONToClient(news.client, MsgMessage{"admitted", "Welcome, game admin!."})
	}
	// TODO: send join notification to clients
}
