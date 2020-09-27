package game

import (
	"log"
	"net/http"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
	"git.cipherboy.com/WillowPatchGames/wpg/internal/models"
	"git.cipherboy.com/WillowPatchGames/wpg/internal/utils"

	api_errors "git.cipherboy.com/WillowPatchGames/wpg/pkg/errors"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/auth"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/hwaterr"
)

type deleteHandlerData struct {
	GameID   uint64 `json:"id,omitempty" query:"id,omitempty" route:"GameID,omitempty"`
	APIToken string `json:"api_token,omitempty" header:"X-Auth-Token,omitempty" query:"api_token,omitempty"`
}

type deleteHandlerResponse struct {
	GameID uint64 `json:"id"`
	Status string `json:"status"`
}

type DeleteHandler struct {
	auth.Authed
	hwaterr.ErrableHandler
	utils.HTTPRequestHandler

	req  deleteHandlerData
	resp deleteHandlerResponse
	user *models.UserModel
}

func (handle DeleteHandler) GetResponse() interface{} {
	return handle.resp
}

func (handle *DeleteHandler) GetObjectPointer() interface{} {
	return &handle.req
}

func (handle *DeleteHandler) GetToken() string {
	return handle.req.APIToken
}

func (handle *DeleteHandler) SetUser(user *models.UserModel) {
	handle.user = user
}

func (handle *DeleteHandler) ServeErrableHTTP(w http.ResponseWriter, r *http.Request) error {
	if handle.req.GameID == 0 {
		return hwaterr.WrapError(api_errors.ErrMissingRequest, http.StatusBadRequest)
	}

	tx, err := database.GetTransaction()
	if err != nil {
		log.Println("Transaction?", err)
		return err
	}

	var game models.GameModel
	err = game.FromID(tx, handle.req.GameID)
	if err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			log.Print("Unable to rollback:", rollbackErr)
		}

		log.Println("Getting game?", err)
		return err
	}

	if game.OwnerID != handle.user.ID {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			log.Print("Unable to rollback:", rollbackErr)
		}

		return hwaterr.WrapError(api_errors.ErrAccessDenied, http.StatusUnauthorized)
	}

	game.Lifecycle = "finished"

	err = game.Save(tx)
	if err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			log.Print("Unable to rollback:", rollbackErr)
		}

		log.Println("Saving game?", err)
		return err
	}

	err = tx.Commit()
	if err != nil {
		log.Println("Commiting?", err)
		return err
	}

	handle.resp.GameID = game.ID
	handle.resp.Status = "deleted"

	utils.SendResponse(w, r, handle)
	return nil
}
