// Copyright 2013 The Gorilla WebSocket Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package game

import (
	"bytes"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"

	api_errors "git.cipherboy.com/WordCorp/api/pkg/errors"
	"git.cipherboy.com/WordCorp/api/pkg/middleware/parsel"

	"git.cipherboy.com/WordCorp/api/internal/database"
	"git.cipherboy.com/WordCorp/api/internal/models"
)

const (
	// Time allowed to write a message to the peer.
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer.
	pongWait = 60 * time.Second

	// Send pings to peer with this period. Must be less than pongWait.
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer.
	maxMessageSize = 512
)

var (
	newline = []byte{'\n'}
	space   = []byte{' '}
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

// Client is a middleman between the websocket connection and the hub.
type Client struct {
	hub *Hub

	// The websocket connection.
	conn *websocket.Conn

	// Buffered channel of outbound messages.
	send chan []byte
}

// ClientRegister registers a client with the hub on a game
type ClientRegister struct {
	client *Client

	gameid uint64
	userid uint64
}

// ClientMessage holds messages from clients
type ClientMessage struct {
	client *Client

	message string
}

// readPump pumps messages from the websocket connection to the hub.
//
// The application runs readPump in a per-connection goroutine. The application
// ensures that there is at most one reader on a connection by executing all
// reads from this goroutine.
func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		_ = c.conn.Close()
	}()
	c.conn.SetReadLimit(maxMessageSize)
	_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error { _ = c.conn.SetReadDeadline(time.Now().Add(pongWait)); return nil })
	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}
		message = bytes.TrimSpace(bytes.Replace(message, newline, space, -1))
		c.hub.process <- ClientMessage{c, string(message)}
	}
}

// writePump pumps messages from the hub to the websocket connection.
//
// A goroutine running writePump is started for each connection. The
// application ensures that there is at most one writer to a connection by
// executing all writes from this goroutine.
func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		_ = c.conn.Close()
	}()
	for {
		select {
		case message, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// The hub closed the channel.
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			_, _ = w.Write(message)

			// Add queued chat messages to the current websocket message.
			/*
				n := len(c.send)
				for i := 0; i < n; i++ {
					w.Write(newline)
					w.Write(<-c.send)
				}
			*/

			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

type socketHandlerRequest struct {
	GameID uint64 `query:"id,omitempty" route:"GameID,omitempty"`
	UserID uint64 `query:"user_id,omitempty" route:"UserID,omitempty"`
}

// SocketHandler is a handler for game connections
type SocketHandler struct {
	http.Handler
	parsel.Parseltongue

	Hub *Hub

	req socketHandlerRequest
}

func (handle *SocketHandler) GetObjectPointer() interface{} {
	return &handle.req
}

func (handle SocketHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	tx, err := database.GetTransaction()
	if err != nil {
		log.Println(err)
		api_errors.WriteError(w, err, true)
		return
	}

	// Verify user
	var userdb models.UserModel
	err = userdb.FromEid(tx, handle.req.UserID)
	if err != nil {
		log.Println(err)
		api_errors.WriteError(w, err, true)
		return
	}

	// Verify game
	var gamedb models.GameModel
	err = gamedb.FromEid(tx, handle.req.GameID)
	if err != nil {
		log.Println(err)
		api_errors.WriteError(w, err, true)
		return
	}

	// Initialize the Websocket connection
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		api_errors.WriteError(w, err, true)
		return
	}

	err = tx.Commit()
	if err != nil {
		log.Println(err)
		api_errors.WriteError(w, err, true)
		return
	}

	log.Println("ServeHTTP - ", handle.Hub)

	// Create Client, Player
	client := &Client{hub: handle.Hub, conn: conn, send: make(chan []byte, 256)}

	// Connect Player to ActiveGame, Client to Hub
	client.hub.register <- ClientRegister{client, gamedb.Id, userdb.Id}

	// Allow collection of memory referenced by the caller by doing all work in
	// new goroutines.
	go client.writePump()
	go client.readPump()
}
