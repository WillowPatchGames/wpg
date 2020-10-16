package game

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

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
	JoinCode  string      `json:"code,omitempty"`
	Lifecycle string      `json:"lifecycle"`
	Config    interface{} `json:"config"`
	Admitted  bool        `json:"admitted"`
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

func (handle *QueryHandler) Validate() error {
	if handle.req.GameID == 0 && handle.req.JoinCode == "" {
		return api_errors.ErrMissingRequest
	}

	if handle.req.GameID != 0 && handle.req.JoinCode != "" {
		return api_errors.ErrTooManySpecifiers
	}

	if handle.req.JoinCode != "" {
		if !strings.HasPrefix(handle.req.JoinCode, "gc-") && !strings.HasPrefix(handle.req.JoinCode, "gp-") {
			return errors.New("invalid join code identifier format")
		}
	}

	return nil
}

func (handle *QueryHandler) ServeErrableHTTP(w http.ResponseWriter, r *http.Request) error {
	err := handle.Validate()
	if err != nil {
		return hwaterr.WrapError(err, http.StatusBadRequest)
	}

	var game database.Game
	var game_player database.GamePlayer
	var gameConfig map[string]interface{}

	if err := database.InTransaction(func(tx *gorm.DB) error {
		if handle.req.GameID > 0 {
			if err := tx.First(&game, handle.req.GameID).Error; err != nil {
				return err
			}

			// Looking up a game by integer identifier isn't sufficient to join any
			// game. Return an error in this case.
			if err := tx.First(&game_player, "user_id = ? AND game_id = ?", handle.user.ID, game.ID).Error; err != nil {
				return err
			}
		} else if strings.HasPrefix(handle.req.JoinCode, "gc-") {
			if err := tx.First(&game, "join_code = ?", handle.req.JoinCode).Error; err != nil {
				return err
			}

			if err := tx.First(&game_player, "user_id = ? AND game_id = ?", handle.user.ID, game.ID).Error; err != nil {
				if !game.Open {
					return errors.New("unable to join closed game by game-level join code identifier")
				}

				game_player.UserID.Valid = true
				game_player.UserID.Int64 = int64(handle.user.ID)
				game_player.GameID = game.ID
				game_player.Admitted = false
				if err := tx.Create(&game_player).Error; err != nil {
					return err
				}
			}
		} else if strings.HasPrefix(handle.req.JoinCode, "gp-") {
			if err := tx.First(&game_player, "join_code = ?", handle.req.JoinCode).Error; err != nil {
				return err
			}

			if game_player.UserID.Valid && game_player.UserID.Int64 != int64(handle.user.ID) {
				err = errors.New("unable to join with another users' join code")
				return hwaterr.WrapError(err, http.StatusForbidden)
			}

			if !game_player.UserID.Valid {
				game_player.UserID.Valid = true
				game_player.UserID.Int64 = int64(handle.user.ID)

				if err := tx.Save(&game_player).Error; err != nil {
					return err
				}
			}

			if err := tx.First(&game, "id = ?", game_player.GameID).Error; err != nil {
				return err
			}
		} else {
			panic("Error case")
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
	handle.resp.Admitted = game_player.Admitted
	handle.resp.Style = game.Style

	if game_player.Admitted && !game_player.Banned {
		handle.resp.Open = game.Open
		handle.resp.JoinCode = game.JoinCode.String
		handle.resp.Lifecycle = game.Lifecycle
		handle.resp.Config = gameConfig
	}

	utils.SendResponse(w, r, handle)
	return nil
}
