package room

import (
	"encoding/json"
	"log"
	"net/http"

	"gorm.io/gorm"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/business"
	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
	"git.cipherboy.com/WillowPatchGames/wpg/internal/utils"

	api_errors "git.cipherboy.com/WillowPatchGames/wpg/pkg/errors"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/auth"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/hwaterr"
)

type createHandlerData struct {
	Style    string          `json:"style"`
	Open     bool            `json:"open"`
	Config   *RushRoomConfig `json:"config"`
	APIToken string          `json:"api_token,omitempty" header:"X-Auth-Token,omitempty" query:"api_token,omitempty"`
}

type createHandlerResponse struct {
	RoomID uint64 `json:"id"`
	Owner  uint64 `json:"owner"`
	Style  string `json:"style"`
	Open   bool   `json:"open"`
	Code   string `json:"code"`
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
		room.JoinCode = utils.RandomWords()

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

		return business.AccountToPlan(tx, user_plan_id, room.ID, 0)
	}); err != nil {
		return err
	}

	handle.resp.RoomID = room.ID
	handle.resp.Owner = room.OwnerID
	handle.resp.Style = room.Style
	handle.resp.Open = room.Open
	handle.resp.Code = room.JoinCode

	utils.SendResponse(w, r, &handle)
	return nil
}
