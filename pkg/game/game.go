// Copyright 2013 The Gorilla WebSocket Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package game

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"strconv"
)

// Hub maintains the set of active clients and broadcasts messages to the
// clients.
type Hub struct {
	// Registered clients.
	clients map[*Client]*Player

	// Register requests from the clients.
	register chan *Client

	// Unregister requests from clients.
	unregister chan *Client

	process chan ClientMessage

	game *Game
}

// NewHub news hubs
func NewHub() *Hub {
	return &Hub{
		register:   make(chan *Client),
		unregister: make(chan *Client),
		clients:    make(map[*Client]*Player),
		process:    make(chan ClientMessage),
		game:       newGame(),
	}
}

// A Letter with a uuid
type Letter struct {
	ID    int32  `json:"id"`
	Value string `json:"value"`
}

// Msgtype struct helps extract "type" field from json
type Msgtype struct {
	Command string `json:"type"`
}

// Msgdiscard for discard type messages
type Msgdiscard struct {
	Letter Letter `json:"letter"`
}

// Msgadd for add letter responses
type Msgadd struct {
	Command string   `json:"type"`
	Letters []Letter `json:"letters"`
}

// Msgmessage to send message
type Msgmessage struct {
	Command string `json:"type"`
	Message string `json:"message"`
}

// Game state
type Game struct {
	letters  []Letter
	finished bool
}

const tilepile = 50

const initialdraw = 10

const discarddraw = 3

func newGame() *Game {
	letters := make([]Letter, tilepile)
	for i := range letters {
		letters[i] = Letter{int32(i), randomLetter()}
	}

	rand.Shuffle(len(letters), func(i, j int) {
		letters[i], letters[j] = letters[j], letters[i]
	})

	return &Game{
		letters,
		false,
	}
}

var letterfreq = map[string]float64{
	"A": 8.04,
	"B": 1.48,
	"C": 3.34,
	"D": 3.82,
	"E": 12.49,
	"F": 2.40,
	"G": 1.87,
	"H": 5.05,
	"I": 7.57,
	"J": 0.16,
	"K": 0.54,
	"L": 4.07,
	"M": 2.51,
	"N": 7.23,
	"O": 7.64,
	"P": 2.14,
	"Q": 0.12,
	"R": 6.28,
	"S": 6.51,
	"T": 9.28,
	"U": 2.73,
	"V": 1.05,
	"W": 1.68,
	"X": 0.23,
	"Y": 1.66,
	"Z": 0.09,
}

func randomLetter() string {
	i := rand.Float64() * 99.98
	for letter := range letterfreq {
		i -= letterfreq[letter]
		if i < 0.0 {
			return letter
		}
	}
	return "E"
}

func (g *Game) nextLetter() Letter {
	letter := g.letters[0]
	g.letters = g.letters[1:]
	return letter
}

func (g *Game) addLetter(letter Letter) {
	g.letters = append(g.letters, letter)
}

// Player state
type Player struct {
	name    string
	letters []Letter
}

func (h *Hub) deleteClient(client *Client) {
	delete(h.clients, client)
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

func (h *Hub) sendToAll(message string) {
	for client := range h.clients {
		h.sendToClient(client, message)
	}
}

func (h *Hub) sendJSONToAll(data interface{}) {
	buf, err := json.Marshal(data)
	if err == nil {
		h.sendToAll(string(buf))
	} else {
		fmt.Println(err)
	}
}

func (h *Hub) getPlayer(client *Client) (*Player, bool) {
	player, ok := h.clients[client]
	if !ok {
		h.sendErrToClient(client, "You are not playing this game.")
	}
	return player, ok
}

func (h *Hub) actOn(client *Client, buf string) {
	var cmd Msgtype
	err := json.Unmarshal([]byte(buf), &cmd)
	if err != nil {
		h.sendErrToClient(client, err.Error())
		return
	}
	if cmd.Command == "draw" {
		if h.game.finished {
			h.sendErrToClient(client, "Game finished.")
		} else {
			if player, ok := h.getPlayer(client); ok {
				if len(h.game.letters) >= len(h.clients) {
					for klient := range h.clients {
						l := h.game.letters[0]
						h.game.letters = h.game.letters[1:]
						h.clients[klient].letters = append(h.clients[klient].letters, l)
						h.sendJSONToClient(klient, Msgadd{"add", []Letter{l}})
						if klient == client {
							h.sendJSONToClient(klient, Msgmessage{"draw", "You drew!"})
						} else {
							h.sendJSONToClient(klient, Msgmessage{"draw", player.name + " drew!"})
						}
					}
				} else {
					h.game.finished = true
					h.game.letters = nil
					message := "Player " + player.name + " won"
					h.sendJSONToAll(Msgmessage{"gameover", message})
				}
			} else {
			}
		}
	} else if cmd.Command == "discard" {
		if player, ok := h.getPlayer(client); ok {
			if len(h.game.letters) >= discarddraw {
				var msg Msgdiscard
				err := json.Unmarshal([]byte(buf), &msg)
				if err != nil {
					h.sendErrToClient(client, err.Error())
					return
				}
				found := -1
				for i := range player.letters {
					if msg.Letter == player.letters[i] {
						found = i
					}
				}
				if found == -1 {
					h.sendErrToClient(client, "The letter was not assigned to you.")
					return
				}
				player.letters = append(player.letters[:found], player.letters[found+1:]...)
				letters := []Letter{}
				for i := 0; i < discarddraw; i++ {
					l := h.game.nextLetter()
					letters = append(letters, l)
					player.letters = append(player.letters, l)
				}
				h.game.addLetter(msg.Letter)

				h.sendJSONToClient(client, Msgadd{"add", letters})
			} else {
				h.sendErrToClient(client, "There are not enough letters left!")
			}
		}
	} else {
		h.sendErrToClient(client, "Unrecognized message type: "+cmd.Command+".")
	}
}

// Run runs fast
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			if !h.game.finished && len(h.game.letters) > initialdraw {
				letters := h.game.letters[:initialdraw]
				h.game.letters = h.game.letters[initialdraw:]
				fmt.Println(letters)
				player := Player{"Ready player " + strconv.Itoa(len(h.clients)+1), letters}
				h.clients[client] = &player
				h.sendJSONToClient(client, Msgadd{"add", letters})
			} else {
				h.sendErrToClient(client, "Game finished.")
				h.deleteClient(client)
			}
		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				h.deleteClient(client)
			}
		case news := <-h.process:
			h.actOn(news.client, news.message)
		}
	}
}
