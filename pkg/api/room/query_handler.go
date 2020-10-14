package room

import (
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
	RoomID   uint64 `json:"id,omitempty" query:"id,omitempty" route:"RoomID,omitempty"`
	JoinCode string `json:"join,omitempty" query:"join,omitempty" route:"JoinCode,omitempty"`
	APIToken string `json:"api_token,omitempty" header:"X-Auth-Token,omitempty" query:"api_token,omitempty"`
}

type queryHandlerResponse struct {
	RoomID       uint64   `json:"id"`
	Owner        uint64   `json:"owner"`
	Style        string   `json:"style,omitempty"`
	Open         bool     `json:"open"`
	CurrentGames []uint64 `json:"games,omitempty"`
	Admitted     bool     `json:"admitted"`
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
	if handle.req.RoomID == 0 && handle.req.JoinCode == "" {
		return api_errors.ErrMissingRequest
	}

	if handle.req.RoomID != 0 && handle.req.JoinCode != "" {
		return api_errors.ErrTooManySpecifiers
	}

	if handle.req.JoinCode != "" {
		if !strings.HasPrefix(handle.req.JoinCode, "rc-") && !strings.HasPrefix(handle.req.JoinCode, "rp-") {
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

	var room database.Room
	var room_player database.RoomPlayer

	if err := database.InTransaction(func(tx *gorm.DB) error {
		if handle.req.RoomID > 0 {
			if err := tx.Preload("Games", "lifecycle = ?", "pending").First(&room, handle.req.RoomID).Error; err != nil {
				return err
			}

			// Looking up a room by integer identifier isn't sufficient to join any
			// room. Return an error in this case.
			if err := tx.First(&room_player, "user_id = ? AND room_id = ?", handle.user.ID, room.ID).Error; err != nil {
				return err
			}
		} else if strings.HasPrefix(handle.req.JoinCode, "rc-") {
			if err := tx.Preload("Games", "lifecycle = ?", "pending").First(&room, "join_code = ?", handle.req.JoinCode).Error; err != nil {
				return err
			}

			if err := tx.First(&room_player, "user_id = ? AND room_id = ?", handle.user.ID, room.ID).Error; err != nil {

				if !room.Open {
					return errors.New("unable to join closed room by room-level join code identifier")
				}

				room_player.UserID.Valid = true
				room_player.UserID.Int64 = int64(handle.user.ID)
				room_player.RoomID = room.ID
				room_player.Admitted = false
				if err := tx.Create(&room_player).Error; err != nil {
					return err
				}
			}
		} else if strings.HasPrefix(handle.req.JoinCode, "rp-") {
			if err := tx.First(&room_player, "join_code = ?", handle.req.JoinCode).Error; err != nil {
				return err
			}

			if room_player.UserID.Valid && room_player.UserID.Int64 != int64(handle.user.ID) {
				err = errors.New("unable to join with another users' join code")
				return hwaterr.WrapError(err, http.StatusForbidden)
			}

			if !room_player.UserID.Valid {
				room_player.UserID.Valid = true
				room_player.UserID.Int64 = int64(handle.user.ID)
				if err := tx.Save(&room_player).Error; err != nil {
					return err
				}
			}

			if err := tx.Preload("Games", "lifecycle = ?", "pending").First(&room, "id = ?", room_player.RoomID).Error; err != nil {
				return err
			}
		}

		return nil
	}); err != nil {
		return err
	}

	handle.resp.RoomID = room.ID
	handle.resp.Owner = room.OwnerID
	handle.resp.Open = room.Open
	handle.resp.Admitted = room_player.Admitted && !room_player.Banned

	if room_player.Admitted {
		handle.resp.Style = room.Style

		if len(room.Games) > 0 {
			handle.resp.CurrentGames = make([]uint64, len(room.Games))
			for index, game := range room.Games {
				handle.resp.CurrentGames[index] = game.ID
			}
		}
	}

	utils.SendResponse(w, r, handle)
	return nil
}
