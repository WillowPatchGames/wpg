package room

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
	RoomID   uint64 `json:"id,omitempty" query:"id,omitempty" route:"RoomID,omitempty"`
	JoinCode string `json:"join,omitempty" query:"join,omitempty" route:"JoinCode,omitempty"`
	APIToken string `json:"api_token,omitempty" header:"X-Auth-Token,omitempty" query:"api_token,omitempty"`
}

type queryHandlerResponse struct {
	RoomID       uint64   `json:"id"`
	Owner        uint64   `json:"owner"`
	Style        string   `json:"style"`
	Open         bool     `json:"open"`
	CurrentGames []uint64 `json:"games"`
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
	if handle.req.RoomID == 0 && handle.req.JoinCode == "" {
		return hwaterr.WrapError(api_errors.ErrMissingRequest, http.StatusBadRequest)
	}

	tx, err := database.GetTransaction()
	if err != nil {
		log.Println("Transaction?", err)
		return err
	}

	var room models.RoomModel

	if handle.req.RoomID > 0 {
		err = room.FromID(tx, handle.req.RoomID)
	} else {
		err = room.FromJoinCode(tx, handle.req.JoinCode)
	}

	if err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			log.Print("Unable to rollback:", rollbackErr)
		}

		log.Println("Getting room?", err)
		return err
	}

	var owner models.UserModel
	err = owner.FromID(tx, room.OwnerID)
	if err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			log.Print("Unable to rollback:", rollbackErr)
		}

		log.Println("Getting user?", err)
		return err
	}

	var games []*models.GameModel
	games, err = room.GetCurrentGames(tx)
	if err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			log.Print("Unable to rollback:", rollbackErr)
		}

		log.Println("Getting game?", err)
		return err
	}

	err = tx.Commit()
	if err != nil {
		log.Println("Commiting?")
		return err
	}

	handle.resp.RoomID = room.ID
	handle.resp.Owner = owner.ID
	handle.resp.Style = room.Style
	handle.resp.Open = room.Open

	if len(games) > 0 {
		handle.resp.CurrentGames = make([]uint64, len(games))
		for index, game := range games {
			handle.resp.CurrentGames[index] = game.ID
		}
	}

	utils.SendResponse(w, r, handle)
	return nil
}
