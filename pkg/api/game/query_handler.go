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

type queryHandlerData struct {
	GameID   uint64 `json:"id,omitempty" query:"id,omitempty" route:"GameID,omitempty"`
	JoinCode string `json:"join,omitempty" query:"join,omitempty" route:"JoinCode,omitempty"`
	APIToken string `json:"api_token,omitempty" header:"X-Auth-Token,omitempty" query:"api_token,omitempty"`
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
	auth.Authed
	hwaterr.ErrableHandler
	utils.HTTPRequestHandler

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
	return handle.req.APIToken
}

func (handle *QueryHandler) SetUser(user *models.UserModel) {
	handle.user = user
}

func (handle *QueryHandler) ServeErrableHTTP(w http.ResponseWriter, r *http.Request) error {
	if handle.req.GameID == 0 && handle.req.JoinCode == "" {
		return api_errors.ErrMissingRequest
	}

	tx, err := database.GetTransaction()
	if err != nil {
		log.Println("Transaction?", err)
		return err
	}

	var game models.GameModel

	if handle.req.GameID > 0 {
		err = game.FromID(tx, handle.req.GameID)
	} else {
		err = game.FromJoinCode(tx, handle.req.JoinCode)
	}

	if err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			log.Print("Unable to rollback:", rollbackErr)
		}

		log.Println("Getting game?", err)
		return err
	}

	var owner models.UserModel
	err = owner.FromID(tx, game.OwnerID)
	if err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			log.Print("Unable to rollback:", rollbackErr)
		}

		log.Println("Getting user?", err)
		return err
	}

	var room *models.RoomModel
	if game.RoomID > 0 {
		room = new(models.RoomModel)
		err = room.FromID(tx, game.RoomID)
		if err != nil {
			if rollbackErr := tx.Rollback(); rollbackErr != nil {
				log.Print("Unable to rollback:", rollbackErr)
			}

			log.Println("Getting room?", err)
			return err
		}
	}

	err = tx.Commit()
	if err != nil {
		log.Println("Commiting?", err)
		return err
	}

	handle.resp.GameID = game.ID
	handle.resp.Owner = owner.ID
	if room != nil {
		handle.resp.Room = room.ID
	}
	handle.resp.Style = game.Style
	handle.resp.Open = game.Open
	handle.resp.Lifecycle = game.Lifecycle

	utils.SendResponse(w, r, handle)
	return nil
}
