package game

import (
	"encoding/json"
	"net/http"

	"gorm.io/gorm"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
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
	GameID    uint64      `json:"id"`
	Owner     uint64      `json:"owner"`
	Room      uint64      `json:"room"`
	Style     string      `json:"style"`
	Open      bool        `json:"open"`
	JoinCode  string      `json:"code"`
	Lifecycle string      `json:"lifecycle"`
	Config    interface{} `json:"config"`
}

type QueryHandler struct {
	auth.Authed
	hwaterr.ErrableHandler
	utils.HTTPRequestHandler

	req  queryHandlerData
	resp queryHandlerResponse
	user *database.User
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

func (handle *QueryHandler) SetUser(user *database.User) {
	handle.user = user
}

func (handle *QueryHandler) ServeErrableHTTP(w http.ResponseWriter, r *http.Request) error {
	if handle.req.GameID == 0 && handle.req.JoinCode == "" {
		return hwaterr.WrapError(api_errors.ErrMissingRequest, http.StatusBadRequest)
	}

	var game database.Game
	var gameConfig map[string]interface{}

	if err := database.InTransaction(func(tx *gorm.DB) error {
		if handle.req.GameID > 0 {
			if err := tx.First(&game, handle.req.GameID).Error; err != nil {
				return err
			}
		} else {
			if err := tx.First(&game, "join_code = ?", handle.req.JoinCode).Error; err != nil {
				return err
			}
		}

		if game.Config.Valid {
			if err := json.Unmarshal([]byte(game.Config.String), &gameConfig); err != nil {
				return err
			}
		}

		return nil
	}); err != nil {
		return err
	}

	handle.resp.GameID = game.ID
	handle.resp.Owner = game.OwnerID
	if game.RoomID.Valid {
		handle.resp.Room = uint64(game.RoomID.Int64)
	}
	handle.resp.Style = game.Style
	handle.resp.Open = game.Open
	handle.resp.JoinCode = game.JoinCode
	handle.resp.Lifecycle = game.Lifecycle
	handle.resp.Config = gameConfig

	utils.SendResponse(w, r, handle)
	return nil
}
