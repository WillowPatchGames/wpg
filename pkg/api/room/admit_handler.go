package room

import (
	"errors"
	"log"
	"net/http"

	"gorm.io/gorm"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
	"git.cipherboy.com/WillowPatchGames/wpg/internal/utils"

	api_errors "git.cipherboy.com/WillowPatchGames/wpg/pkg/errors"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/auth"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/hwaterr"
)

type admitHandlerData struct {
	RoomID   uint64 `json:"id,omitempty" query:"id,omitempty" route:"RoomID,omitempty"`
	UserID   uint64 `json:"user_id,omitempty" query:"user_id,omitempty" route:"UserID,omitempty"`
	Admitted bool   `json:"admitted,omitempty" query:"admitted,omitempty"`
	Banned   bool   `json:"banned,omitempty" query:"banned,omitempty"`
	APIToken string `json:"api_token,omitempty" header:"X-Auth-Token,omitempty" query:"api_token,omitempty"`
}

type admitHandlerResponse struct {
	UserID   uint64 `json:"user_id"`
	Admitted bool   `json:"admitted"`
	Banned   bool   `json:"banned"`
}

type AdmitHandler struct {
	auth.Authed
	hwaterr.ErrableHandler
	utils.HTTPRequestHandler

	req  admitHandlerData
	resp admitHandlerResponse
	user *database.User
}

func (handle AdmitHandler) GetResponse() interface{} {
	return handle.resp
}

func (handle *AdmitHandler) GetObjectPointer() interface{} {
	return &handle.req
}

func (handle *AdmitHandler) GetToken() string {
	return handle.req.APIToken
}

func (handle *AdmitHandler) SetUser(user *database.User) {
	handle.user = user
}

func (handle *AdmitHandler) Validate() error {
	if handle.req.RoomID == 0 {
		return api_errors.ErrMissingRequest
	}

	if handle.req.UserID == 0 {
		return api_errors.ErrMissingRequest
	}

	return nil
}

func (handle *AdmitHandler) ServeErrableHTTP(w http.ResponseWriter, r *http.Request) error {
	err := handle.Validate()
	if err != nil {
		return hwaterr.WrapError(err, http.StatusBadRequest)
	}

	var room database.Room
	var room_member database.RoomMember

	if err := database.InTransaction(func(tx *gorm.DB) error {
		if err := tx.First(&room, handle.req.RoomID).Error; err != nil {
			return err
		}

		if handle.user.ID != room.OwnerID {
			return hwaterr.WrapError(api_errors.ErrAccessDenied, http.StatusForbidden)
		}

		if handle.req.UserID == room.OwnerID {
			return errors.New("can't modify room owner's admitted/banned status")
		}

		if err := tx.First(&room_member, "user_id = ? AND room_id = ?", handle.req.UserID, room.ID).Error; err != nil {
			return err
		}

		room_member.Admitted = handle.req.Admitted
		if room_member.Banned {
			room_member.Admitted = false
		}

		room_member.Banned = handle.req.Banned

		if room_member.Admitted {
			var games []database.Game
			if err := tx.Model(&database.Game{}).Where("room_id = ?", room.ID).Find(&games).Error; err != nil {
				return err
			}

			var candidateError error = nil
			for _, game := range games {
				var game_player database.GamePlayer
				if err := tx.First(&game_player, "user_id = ? AND game_id = ?", room_member.UserID, game.ID).Error; err == nil {
					// If this game player already exists, leave it as-is; this way game
					// state doesn't get messed up.
					continue
				}

				game_player.UserID = room_member.UserID
				game_player.GameID = game.ID
				if !game.Open {
					game_player.JoinCode.Valid = true
					game_player.JoinCode.String = "gp-" + utils.JoinCode()
				}

				if game.Lifecycle == "pending" || game.Lifecycle == "finished" {
					game_player.Admitted = true
				} else {
					game_player.Admitted = false
				}

				if err := tx.Create(&game_player).Error; err != nil {
					log.Println("Unable to create game_player from room member:", game_player, room_member, err)
					candidateError = err
					continue
				}
			}

			if candidateError != nil {
				return err
			}
		}

		return tx.Save(&room_member).Error
	}); err != nil {
		return err
	}

	handle.resp.UserID = handle.req.UserID
	handle.resp.Admitted = handle.req.Admitted
	handle.resp.Banned = handle.req.Banned

	utils.SendResponse(w, r, handle)
	return nil
}
