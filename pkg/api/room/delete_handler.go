package room

import (
	"errors"
	"net/http"

	"gorm.io/gorm"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
	"git.cipherboy.com/WillowPatchGames/wpg/internal/utils"

	api_errors "git.cipherboy.com/WillowPatchGames/wpg/pkg/errors"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/auth"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/hwaterr"
)

type deleteHandlerData struct {
	RoomID   uint64 `json:"id,omitempty" query:"id,omitempty" route:"RoomID,omitempty"`
	APIToken string `json:"api_token,omitempty" header:"X-Auth-Token,omitempty" query:"api_token,omitempty"`
}

type deleteHandlerResponse struct {
	RoomID uint64 `json:"id"`
	Status string `json:"status"`
}

type DeleteHandler struct {
	auth.Authed
	hwaterr.ErrableHandler
	utils.HTTPRequestHandler

	req  deleteHandlerData
	resp deleteHandlerResponse
	user *database.User
}

func (handle DeleteHandler) GetResponse() interface{} {
	return handle.resp
}

func (handle *DeleteHandler) GetObjectPointer() interface{} {
	return &handle.req
}

func (handle *DeleteHandler) GetToken() string {
	return handle.req.APIToken
}

func (handle *DeleteHandler) SetUser(user *database.User) {
	handle.user = user
}

func (handle *DeleteHandler) ServeErrableHTTP(w http.ResponseWriter, r *http.Request) error {
	if handle.req.RoomID == 0 {
		return hwaterr.WrapError(api_errors.ErrMissingRequest, http.StatusBadRequest)
	}

	var room database.Room

	if err := database.InTransaction(func(tx *gorm.DB) error {
		if err := tx.First(&room, handle.req.RoomID).Error; err != nil {
			return err
		}

		if err := room.HandleExpiration(tx); err != nil {
			return err
		}

		if room.Lifecycle != "playing" {
			return errors.New("unable to delete room that isn't open")
		}

		if room.OwnerID != handle.user.ID {
			return hwaterr.WrapError(api_errors.ErrAccessDenied, http.StatusUnauthorized)
		}

		if err := tx.Model(&room).Update("lifecycle", "deleted").Error; err != nil {
			return err
		}

		return tx.Table("games").Where("room_id = ? AND lifecycle = ?", room.ID, "pending").Update("lifecycle", "deleted").Error
	}); err != nil {
		return err
	}

	handle.resp.RoomID = room.ID
	handle.resp.Status = "deleted"

	utils.SendResponse(w, r, handle)
	return nil
}
