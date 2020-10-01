package game

import (
	"log"
	"net/http"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
	"git.cipherboy.com/WillowPatchGames/wpg/internal/utils"

	"git.cipherboy.com/WillowPatchGames/wpg/pkg/api"
	api_errors "git.cipherboy.com/WillowPatchGames/wpg/pkg/errors"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/games"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/auth"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/hwaterr"
)

type createHandlerData struct {
	RoomID   uint64            `json:"room"`
	Style    string            `json:"style"`
	Open     bool              `json:"open"`
	Config   *games.RushConfig `json:"config"`
	APIToken string            `json:"api_token,omitempty" header:"X-Auth-Token,omitempty" query:"api_token,omitempty"`
}

type createHandlerResponse struct {
	GameID    uint64 `json:"id"`
	Owner     uint64 `json:"owner"`
	Room      uint64 `json:"room,omitempty"`
	Style     string `json:"style"`
	Open      bool   `json:"open"`
	Code      string `json:"code"`
	Lifecycle string `json:"lifecycle"`
}

type CreateHandler struct {
	auth.Authed
	hwaterr.ErrableHandler
	utils.HTTPRequestHandler

	req  createHandlerData
	resp createHandlerResponse
	user *models.UserModel
}

func (handle CreateHandler) GetResponse() interface{} {
	return handle.resp
}

func (handle *CreateHandler) GetObjectPointer() interface{} {
	return &handle.req
}

func (handle *CreateHandler) GetToken() string {
	return handle.req.APIToken
}

func (handle *CreateHandler) SetUser(user *models.UserModel) {
	handle.user = user
}

func (handle CreateHandler) verifyRequest() error {
	if handle.req.Style == "" {
		return api_errors.ErrMissingRequest
	}

	if handle.req.Config != nil {
		err := handle.req.Config.Validate()
		if err != nil {
			return err
		}
	}

	return nil
}

func (handle CreateHandler) ServeErrableHTTP(w http.ResponseWriter, r *http.Request) error {
	err := handle.verifyRequest()
	if err != nil {
		return hwaterr.WrapError(err, http.StatusBadRequest)
	}

	tx, err := database.GetTransaction()
	if err != nil {
		return err
	}

	var room *models.RoomModel
	if handle.req.RoomID > 0 {
		room = new(models.RoomModel)
		err = room.FromID(tx, handle.req.RoomID)
		if err != nil {
			if rollbackErr := tx.Rollback(); rollbackErr != nil {
				log.Print("Unable to rollback:", rollbackErr)
			}

			log.Print("Get room?", err)
			return err
		}

		err = api.UserCanCreateGame(*handle.user, *room)
		if err != nil {
			if rollbackErr := tx.Rollback(); rollbackErr != nil {
				log.Print("Unable to rollback:", rollbackErr)
			}

			log.Print("Not authorized?", err)
			return err
		}
	}

	var game models.GameModel
	game.OwnerID = handle.user.ID
	if room != nil {
		game.RoomID = room.ID
	}
	game.Style = handle.req.Style
	game.Open = handle.req.Open

	err = game.Create(tx)
	if err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			log.Print("Unable to rollback:", rollbackErr)
		}

		log.Print("Create?", err)
		return err
	}

	log.Println("Created game")

	if handle.req.Config != nil {
		err = game.SetConfig(tx, handle.req.Config)
		if err != nil {
			if rollbackErr := tx.Rollback(); rollbackErr != nil {
				log.Print("Unable to rollback:", rollbackErr)
			}

			log.Print("Config?", err)
			return err
		}
	}

	log.Println("Set config")

	err = tx.Commit()
	if err != nil {
		return err
	}

	handle.resp.GameID = game.ID
	handle.resp.Owner = handle.user.ID
	if room != nil {
		handle.resp.Room = room.ID
	}
	handle.resp.Style = game.Style
	handle.resp.Open = game.Open
	handle.resp.Code = game.JoinCode
	handle.resp.Lifecycle = game.Lifecycle

	utils.SendResponse(w, r, &handle)
	return nil
}
