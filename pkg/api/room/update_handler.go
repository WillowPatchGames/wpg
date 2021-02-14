package room

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"time"

	"gorm.io/gorm"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
	"git.cipherboy.com/WillowPatchGames/wpg/internal/utils"

	api_errors "git.cipherboy.com/WillowPatchGames/wpg/pkg/errors"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/auth"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/hwaterr"
)

type updateHandlerData struct {
	RoomID   uint64      `json:"id,omitempty" query:"id,omitempty" route:"RoomID,omitempty"`
	Style    string      `json:"style"`
	Config   *RoomConfig `json:"config"`
	APIToken string      `json:"api_token,omitempty" header:"X-Auth-Token,omitempty" query:"api_token,omitempty"`
}

type updateHandlerResponse struct {
	RoomID    uint64      `json:"id"`
	Owner     uint64      `json:"owner"`
	Style     string      `json:"style"`
	Lifecycle string      `json:"lifecycle"`
	Open      bool        `json:"open"`
	Code      string      `json:"code"`
	Config    *RoomConfig `json:"config,omitempty"`
	CreatedAt time.Time   `json:"created_at"`
	UpdatedAt time.Time   `json:"updated_at"`
	ExpiresAt time.Time   `json:"expires_at"`
}

type UpdateHandler struct {
	auth.Authed
	hwaterr.ErrableHandler
	utils.HTTPRequestHandler

	req  updateHandlerData
	resp updateHandlerResponse
	user *database.User
}

func (handle UpdateHandler) GetResponse() interface{} {
	return handle.resp
}

func (handle *UpdateHandler) GetObjectPointer() interface{} {
	return &handle.req
}

func (handle *UpdateHandler) GetToken() string {
	return handle.req.APIToken
}

func (handle *UpdateHandler) SetUser(user *database.User) {
	handle.user = user
}

func (handle UpdateHandler) verifyRequest() error {
	if handle.req.RoomID == 0 {
		return api_errors.ErrMissingRequest
	}

	if handle.req.Style == "" && handle.req.Config == nil {
		return api_errors.ErrMissingRequest
	}

	return nil
}

func (handle *UpdateHandler) ServeErrableHTTP(w http.ResponseWriter, r *http.Request) error {
	err := handle.verifyRequest()
	if err != nil {
		return hwaterr.WrapError(err, http.StatusBadRequest)
	}

	var room database.Room
	if err := database.InTransaction(func(tx *gorm.DB) error {
		if err := tx.First(&room, handle.req.RoomID).Error; err != nil {
			return err
		}

		if err := room.HandleExpiration(tx); err != nil {
			return err
		}

		if room.OwnerID != handle.user.ID {
			return hwaterr.WrapError(api_errors.ErrAccessDenied, http.StatusUnauthorized)
		}

		if room.Lifecycle != "playing" {
			msg := "unable to update a"
			if room.Lifecycle == "expired" {
				msg += "n expired"
			} else {
				msg += " " + room.Lifecycle
			}
			msg += " room"
			return errors.New(msg)
		}

		if handle.req.Style != "" {
			room.Style = handle.req.Style
		}

		if handle.req.Config != nil {
			config, err := json.Marshal(handle.req.Config)
			if err != nil {
				return err
			}

			room.Config.Valid = true
			room.Config.String = string(config)
		}

		return tx.Save(&room).Error
	}); err != nil {
		return err
	}

	handle.resp.RoomID = room.ID
	handle.resp.Owner = room.OwnerID
	handle.resp.Lifecycle = room.Lifecycle
	handle.resp.Open = room.Open
	handle.resp.Style = room.Style
	handle.resp.Code = room.JoinCode.String

	var cfg RoomConfig
	if room.Config.Valid {
		if err := json.Unmarshal([]byte(room.Config.String), &cfg); err != nil {
			return err
		}

		handle.resp.Config = &cfg
	}

	handle.resp.CreatedAt = room.CreatedAt
	handle.resp.UpdatedAt = room.UpdatedAt
	handle.resp.ExpiresAt = room.ExpiresAt

	utils.SendResponse(w, r, handle)
	return nil
}
