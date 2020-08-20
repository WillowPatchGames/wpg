package room

import (
	"log"
	"net/http"

	"git.cipherboy.com/WillowPatchGames/api/internal/database"
	"git.cipherboy.com/WillowPatchGames/api/internal/models"
	"git.cipherboy.com/WillowPatchGames/api/internal/utils"

	api_errors "git.cipherboy.com/WillowPatchGames/api/pkg/errors"
	"git.cipherboy.com/WillowPatchGames/api/pkg/middleware/auth"
	"git.cipherboy.com/WillowPatchGames/api/pkg/middleware/parsel"
)

type queryHandlerData struct {
	RoomID   uint64 `json:"id,omitempty" query:"id,omitempty" route:"RoomID,omitempty"`
	JoinCode string `json:"join,omitempty" query:"join,omitempty" route:"JoinCode,omitempty"`
	ApiToken string `json:"api_token,omitempty" header:"X-Auth-Token,omitempty" query:"api_token,omitempty"`
}

type queryHandlerResponse struct {
	RoomID       uint64   `json:"id"`
	Owner        uint64   `json:"owner"`
	Style        string   `json:"style"`
	Open         bool     `json:"open"`
	CurrentGames []uint64 `json:"games"`
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
	if !utils.IsValidId(handle.req.RoomID) && handle.req.JoinCode == "" {
		api_errors.WriteError(w, api_errors.ErrMissingRequest, true)
		return
	}

	tx, err := database.GetTransaction()
	if err != nil {
		log.Println("Transaction?")
		api_errors.WriteError(w, err, true)
		return
	}

	var room models.RoomModel

	if handle.req.RoomID > 0 {
		err = room.FromEid(tx, handle.req.RoomID)
	} else {
		err = room.FromJoinCode(tx, handle.req.JoinCode)
	}

	if err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			log.Print("Unable to rollback:", rollbackErr)
		}

		log.Println("Getting room?", err)
		api_errors.WriteError(w, err, true)
		return
	}

	var owner models.UserModel
	err = owner.FromId(tx, room.OwnerId)
	if err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			log.Print("Unable to rollback:", rollbackErr)
		}

		log.Println("Getting user?", err)
		api_errors.WriteError(w, err, true)
		return
	}

	var games []*models.GameModel
	games, err = room.GetCurrentGames(tx)
	if err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			log.Print("Unable to rollback:", rollbackErr)
		}

		log.Println("Getting game?", err)
		api_errors.WriteError(w, err, true)
		return
	}

	err = tx.Commit()
	if err != nil {
		log.Println("Commiting?")
		api_errors.WriteError(w, err, true)
		return
	}

	handle.resp.RoomID = room.Eid
	handle.resp.Owner = owner.Eid
	handle.resp.Style = room.Style
	handle.resp.Open = room.Open

	if len(games) > 0 {
		handle.resp.CurrentGames = make([]uint64, len(games))
		for index, game := range games {
			handle.resp.CurrentGames[index] = game.Eid
		}
	}

	utils.SendResponse(w, r, handle)
}
