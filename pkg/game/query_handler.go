package game

import (
	"log"
	"net/http"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
	"git.cipherboy.com/WillowPatchGames/wpg/internal/models"
	"git.cipherboy.com/WillowPatchGames/wpg/internal/utils"

	api_errors "git.cipherboy.com/WillowPatchGames/wpg/pkg/errors"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/auth"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/parsel"
)

type queryHandlerData struct {
	GameID   uint64 `json:"id,omitempty" query:"id,omitempty" route:"GameID,omitempty"`
	JoinCode string `json:"join,omitempty" query:"join,omitempty" route:"JoinCode,omitempty"`
	ApiToken string `json:"api_token,omitempty" header:"X-Auth-Token,omitempty" query:"api_token,omitempty"`
}

type queryHandlerResponse struct {
	GameID    uint64 `json:"id"`
	Owner     uint64 `json:"owner"`
	Room      uint64 `json:"room"`
	Style     string `json:"style"`
	Open      bool   `json:"open"`
	Lifecycle string `json:"lifecycle"`
}

type QueryHandler struct {
	http.Handler
	utils.HTTPRequestHandler
	parsel.Parseltongue
	auth.Authed

	req  queryHandlerData
	resp queryHandlerResponse
	user *models.UserModel
}

func (handle QueryHandler) GetResponse() interface{} {
	return handle.resp
}

func (handle *QueryHandler) GetObjectPointer() interface{} {
	return &handle.req
}

func (handle *QueryHandler) GetToken() string {
	return handle.req.ApiToken
}

func (handle *QueryHandler) SetUser(user *models.UserModel) {
	handle.user = user
}

func (handle *QueryHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if !utils.IsValidId(handle.req.GameID) && handle.req.JoinCode == "" {
		api_errors.WriteError(w, api_errors.ErrMissingRequest, true)
		return
	}

	tx, err := database.GetTransaction()
	if err != nil {
		log.Println("Transaction?")
		api_errors.WriteError(w, err, true)
		return
	}

	var game models.GameModel

	if handle.req.GameID > 0 {
		err = game.FromEid(tx, handle.req.GameID)
	} else {
		err = game.FromJoinCode(tx, handle.req.JoinCode)
	}

	if err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			log.Print("Unable to rollback:", rollbackErr)
		}

		log.Println("Getting game?", err)
		api_errors.WriteError(w, err, true)
		return
	}

	var owner models.UserModel
	err = owner.FromId(tx, game.OwnerId)
	if err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			log.Print("Unable to rollback:", rollbackErr)
		}

		log.Println("Getting user?", err)
		api_errors.WriteError(w, err, true)
		return
	}

	var room models.RoomModel
	err = room.FromId(tx, game.RoomId)
	if err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			log.Print("Unable to rollback:", rollbackErr)
		}

		log.Println("Getting room?", err)
		api_errors.WriteError(w, err, true)
		return
	}

	err = tx.Commit()
	if err != nil {
		log.Println("Commiting?")
		api_errors.WriteError(w, err, true)
		return
	}

	handle.resp.GameID = game.Eid
	handle.resp.Owner = owner.Eid
	handle.resp.Room = room.Eid
	handle.resp.Style = game.Style
	handle.resp.Open = game.Open
	handle.resp.Lifecycle = game.Lifecycle

	utils.SendResponse(w, r, handle)
}
