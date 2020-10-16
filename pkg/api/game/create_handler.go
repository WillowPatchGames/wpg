package game

import (
	"encoding/json"
	"log"
	"net/http"

	"gorm.io/gorm"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/business"
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
	user *database.User
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

func (handle *CreateHandler) SetUser(user *database.User) {
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

	var room *database.Room
	var game database.Game

	if err := database.InTransaction(func(tx *gorm.DB) error {
		var err error
		if handle.req.RoomID > 0 {
			room = new(database.Room)
			if err = tx.First(room, handle.req.RoomID).Error; err != nil {
				return err
			}

			if err = api.UserCanCreateGame(*handle.user, *room); err != nil {
				return err
			}
		}

		var user_plan_id uint64
		if user_plan_id, err = business.CanCreateGame(tx, *handle.user, room, handle.req.Style); err != nil {
			return err
		}

		game.OwnerID = handle.user.ID
		if room != nil {
			game.RoomID.Valid = true
			game.RoomID.Int64 = int64(room.ID)
		}
		game.Style = handle.req.Style
		game.Lifecycle = "pending"
		game.Open = handle.req.Open
		if game.Open {
			game.JoinCode.Valid = true
			game.JoinCode.String = "gc-" + utils.JoinCode()
		}

		if handle.req.Config != nil {
			data, err := json.Marshal(handle.req.Config)
			if err != nil {
				return err
			}

			database.SetSQLFromString(&game.Config, string(data))
		}

		if err = tx.Create(&game).Error; err != nil {
			return err
		}

		if err = business.AccountToPlan(tx, user_plan_id, uint64(game.RoomID.Int64), game.ID); err != nil {
			return err
		}

		if !game.RoomID.Valid {
			// When we're outside of a room, only admit ourselves by default.
			var game_player database.GamePlayer
			game_player.UserID.Valid = true
			game_player.UserID.Int64 = int64(game.OwnerID)
			game_player.GameID = game.ID
			if !game.Open {
				game_player.JoinCode.Valid = true
				game_player.JoinCode.String = "gp-" + utils.JoinCode()
			}
			game_player.Admitted = true
			return tx.Create(&game_player).Error
		} else {
			var members []database.RoomMember
			if err := tx.Model(&database.RoomMember{}).Where("room_id = ?", room.ID).Find(&members).Error; err != nil {
				return err
			}

			var candidateError error = nil
			for _, member := range members {
				if !member.Admitted || member.Banned || !member.UserID.Valid {
					continue
				}

				var game_player database.GamePlayer
				game_player.UserID = member.UserID
				game_player.GameID = game.ID
				if !game.Open {
					game_player.JoinCode.Valid = true
					game_player.JoinCode.String = "gp-" + utils.JoinCode()
				}
				game_player.Admitted = true
				if err := tx.Create(&game_player).Error; err != nil {
					log.Println("Unable to create game_player from room member:", game_player, member, err)
					candidateError = err
					continue
				}
			}

			return candidateError
		}
	}); err != nil {
		log.Println("Got error from handler:", err)
		return err
	}

	handle.resp.GameID = game.ID
	handle.resp.Owner = handle.user.ID
	if room != nil {
		handle.resp.Room = room.ID
	}
	handle.resp.Style = game.Style
	handle.resp.Open = game.Open
	handle.resp.Code = game.JoinCode.String
	handle.resp.Lifecycle = game.Lifecycle

	utils.SendResponse(w, r, &handle)
	return nil
}
