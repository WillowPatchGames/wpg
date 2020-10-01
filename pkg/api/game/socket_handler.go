package game

import (
	"log"
	"net/http"

	"gorm.io/gorm"

	api_errors "git.cipherboy.com/WillowPatchGames/wpg/pkg/errors"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/auth"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/hwaterr"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
)

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

	user *database.User
}

func (handle *SocketHandler) GetObjectPointer() interface{} {
	return &handle.req
}

func (handle *SocketHandler) GetToken() string {
	return handle.req.APIToken
}

func (handle *SocketHandler) SetUser(user *database.User) {
	handle.user = user
}

func (handle SocketHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Verify user
	if handle.req.UserID != handle.user.ID {
		err := hwaterr.WrapError(api_errors.ErrAccessDenied, http.StatusForbidden)
		log.Println(err)
		hwaterr.WriteError(w, r, err)
		return
	}

	// Verify game
	var gamedb database.Game

	if err := database.InTransaction(func(tx *gorm.DB) error {
		return tx.First(&gamedb, handle.req.GameID).Error
	}); err != nil {
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

	log.Println("ServeHTTP - ", handle.Hub)

	// Create Client, Player
	client := &Client{
		hub:    handle.Hub,
		conn:   conn,
		send:   nil,
		gameID: GameID(gamedb.ID),
		userID: UserID(handle.user.ID),
	}

	// Connect Player to ActiveGame, Client to Hub
	handle.Hub.register <- client
}
