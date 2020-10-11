package game

import (
	"net/http"

	"gorm.io/gorm"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
	"git.cipherboy.com/WillowPatchGames/wpg/internal/utils"

	api_errors "git.cipherboy.com/WillowPatchGames/wpg/pkg/errors"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/auth"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/hwaterr"
)

type deleteHandlerData struct {
	GameID   uint64 `json:"id,omitempty" query:"id,omitempty" route:"GameID,omitempty"`
	APIToken string `json:"api_token,omitempty" header:"X-Auth-Token,omitempty" query:"api_token,omitempty"`
}

type deleteHandlerResponse struct {
	GameID uint64 `json:"id"`
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
	if handle.req.GameID == 0 {
		return hwaterr.WrapError(api_errors.ErrMissingRequest, http.StatusBadRequest)
	}

	var game database.Game

	if err := database.InTransaction(func(tx *gorm.DB) error {
		if err := tx.First(&game, handle.req.GameID).Error; err != nil {
			return err
		}

		if game.OwnerID != handle.user.ID {
			return hwaterr.WrapError(api_errors.ErrAccessDenied, http.StatusUnauthorized)
		}

		return tx.Model(&game).Update("lifecycle", "deleted").Error
	}); err != nil {
		return err
	}

	handle.resp.GameID = game.ID
	handle.resp.Status = "deleted"

	utils.SendResponse(w, r, handle)
	return nil
}
