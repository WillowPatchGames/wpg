package game

import (
	"log"
	"net/http"

	"git.cipherboy.com/WordCorp/api/internal/database"
	"git.cipherboy.com/WordCorp/api/internal/models"
	"git.cipherboy.com/WordCorp/api/internal/utils"

	api_errors "git.cipherboy.com/WordCorp/api/pkg/errors"
	"git.cipherboy.com/WordCorp/api/pkg/middleware/parsel"
)

type queryHandlerData struct {
	GameID   uint64 `json:"id,omitempty" query:"id,omitempty" route:"GameID,omitempty"`
}

type queryHandlerResponse struct {
  GameID    uint64 `json:"id"`
  Owner     uint64 `json:"owner"`
  Style     string `json:"style"`
  Open      bool   `json:"open"`
  Lifecycle string `json:"lifecycle"`
}

type QueryHandler struct {
	http.Handler
	utils.HTTPRequestHandler
	parsel.Parseltongue

	req  queryHandlerData
	resp queryHandlerResponse
}

func (handle QueryHandler) GetResponse() interface{} {
	return handle.resp
}

func (handle *QueryHandler) GetObjectPointer() interface{} {
	return &handle.req
}

func (handle *QueryHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if !utils.IsValidId(handle.req.GameID) {
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
	err = game.FromEid(tx, handle.req.GameID)
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

	err = tx.Commit()
	if err != nil {
		log.Println("Commiting?")
		api_errors.WriteError(w, err, true)
		return
	}

	handle.resp.GameID = game.Eid
	handle.resp.Owner = owner.Eid
	handle.resp.Style = game.Style
	handle.resp.Open = game.Open
	handle.resp.Lifecycle = game.Lifecycle

	utils.SendResponse(w, r, handle)
}
