package room

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"gorm.io/gorm"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/business"
	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
	"git.cipherboy.com/WillowPatchGames/wpg/internal/utils"

	api_errors "git.cipherboy.com/WillowPatchGames/wpg/pkg/errors"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/auth"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/hwaterr"
)

type createHandlerData struct {
	Style    string      `json:"style"`
	Open     bool        `json:"open"`
	Config   *RoomConfig `json:"config"`
	APIToken string      `json:"api_token,omitempty" header:"X-Auth-Token,omitempty" query:"api_token,omitempty"`
}

type createHandlerResponse struct {
	RoomID    uint64    `json:"id"`
	Owner     uint64    `json:"owner"`
	Style     string    `json:"style"`
	Lifecycle string    `json:"lifecycle"`
	Open      bool      `json:"open"`
	Code      string    `json:"code"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	ExpiresAt time.Time `json:"expires_at"`
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
		log.Println("Missing style")
		return api_errors.ErrMissingRequest
	}

	return nil
}

func (handle CreateHandler) ServeErrableHTTP(w http.ResponseWriter, r *http.Request) error {
	err := handle.verifyRequest()
	if err != nil {
		return hwaterr.WrapError(err, http.StatusBadRequest)
	}

	var room database.Room

	if err := database.InTransaction(func(tx *gorm.DB) error {
		var err error
		var user_plan_id uint64
		if user_plan_id, err = business.CanCreateRoom(tx, *handle.user); err != nil {
			return err
		}

		room.OwnerID = handle.user.ID
		room.Style = handle.req.Style
		room.Open = handle.req.Open
		if room.Open {
			room.JoinCode.Valid = true
			room.JoinCode.String = "rc-" + utils.JoinCode()
		}
		room.Lifecycle = "playing"

		if handle.req.Config != nil {
			config, err := json.Marshal(handle.req.Config)
			if err != nil {
				return err
			}

			room.Config.Valid = true
			room.Config.String = string(config)
		}

		if err = tx.Create(&room).Error; err != nil {
			return err
		}

		if err := room.HandleExpiration(tx); err != nil {
			return err
		}

		if err = business.AccountToPlan(tx, user_plan_id, room.ID, 0); err != nil {
			return err
		}

		// Add the room creator to this room as a player.
		var room_member database.RoomMember
		room_member.UserID.Valid = true
		room_member.UserID.Int64 = int64(room.OwnerID)
		room_member.RoomID = room.ID
		if !room.Open {
			room_member.JoinCode.Valid = true
			room_member.JoinCode.String = "rp-" + utils.JoinCode()
		}
		room_member.Admitted = true
		return tx.Create(&room_member).Error
	}); err != nil {
		return err
	}

	handle.resp.RoomID = room.ID
	handle.resp.Owner = room.OwnerID
	handle.resp.Style = room.Style
	handle.resp.Lifecycle = room.Lifecycle
	handle.resp.Open = room.Open
	handle.resp.Code = room.JoinCode.String

	handle.resp.CreatedAt = room.CreatedAt
	handle.resp.UpdatedAt = room.UpdatedAt
	handle.resp.ExpiresAt = room.ExpiresAt

	utils.SendResponse(w, r, &handle)
	return nil
}
