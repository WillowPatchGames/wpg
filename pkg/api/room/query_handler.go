package room

import (
	"net/http"

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
	Style        string   `json:"style"`
	Open         bool     `json:"open"`
	Lifecycle    string   `json:"lifecycle"`
	CurrentGames []uint64 `json:"games"`
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
	if handle.req.RoomID == 0 && handle.req.JoinCode == "" {
		return hwaterr.WrapError(api_errors.ErrMissingRequest, http.StatusBadRequest)
	}

	var room database.Room
	var owner database.User

	if err := database.InTransaction(func(tx *gorm.DB) error {
		if handle.req.RoomID > 0 {
			if err := tx.Preload("Games", "lifecycle = ?", "pending").First(&room, handle.req.RoomID).Error; err != nil {
				return err
			}
		} else {
			if err := tx.Preload("Games", "lifecycle = ?", "pending").First(&room, "joincode = ?", handle.req.JoinCode).Error; err != nil {
				return err
			}
		}

		if err := tx.First(&owner, room.OwnerID).Error; err != nil {
			return err
		}

		return nil
	}); err != nil {
		return err
	}

	handle.resp.RoomID = room.ID
	handle.resp.Owner = owner.ID
	handle.resp.Style = room.Style
	handle.resp.Open = room.Open
	handle.resp.Lifecycle = room.Lifecycle

	if len(room.Games) > 0 {
		handle.resp.CurrentGames = make([]uint64, len(room.Games))
		for index, game := range room.Games {
			handle.resp.CurrentGames[index] = game.ID
		}
	}

	utils.SendResponse(w, r, handle)
	return nil
}
