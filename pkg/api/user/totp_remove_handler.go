package user

import (
	"errors"
	"log"
	"net/http"

	"gorm.io/gorm"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
	"git.cipherboy.com/WillowPatchGames/wpg/internal/utils"

	"git.cipherboy.com/WillowPatchGames/wpg/pkg/api"
	api_errors "git.cipherboy.com/WillowPatchGames/wpg/pkg/errors"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/auth"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/hwaterr"
)

type deleteTOTPHandlerData struct {
	UserID   uint64 `json:"id,omitempty" query:"id,omitempty" route:"UserID,omitempty"`
	Username string `json:"username,omitempty" query:"username,omitempty" route:"Username,omitempty"`
	Email    string `json:"email,omitempty" query:"email,omitempty" route:"Email,omitempty"`
	Device   string `json:"device,omitempty" query:"device,omitempty" route:"Device,omitempty"`
	Token    string `json:"token,omitempty" query:"token,omitempty"`
	Password string `json:"password"`
	APIToken string `json:"api_token,omitempty" header:"X-Auth-Token,omitempty" query:"api_token,omitempty"`
}

type deleteTOTPHandlerResponse struct {
	Device  string `json:"device"`
	Removed bool   `json:"removed"`
}

type DeleteTOTPHandler struct {
	auth.Authed
	hwaterr.ErrableHandler
	utils.HTTPRequestHandler

	req  deleteTOTPHandlerData
	resp deleteTOTPHandlerResponse
	user *database.User
}

func (handle DeleteTOTPHandler) GetResponse() interface{} {
	return handle.resp
}

func (handle *DeleteTOTPHandler) GetObjectPointer() interface{} {
	return &handle.req
}

func (handle *DeleteTOTPHandler) GetToken() string {
	return handle.req.APIToken
}

func (handle *DeleteTOTPHandler) SetUser(user *database.User) {
	handle.user = user
}

func (handle DeleteTOTPHandler) verifyRequest() error {
	var present int = 0

	if handle.req.UserID != 0 {
		present++
	}
	if handle.req.Username != "" {
		present++
	}
	if handle.req.Email != "" {
		present++
	}

	if present == 0 && handle.user != nil && handle.user.ID != 0 {
		present++
	}

	if present == 0 {
		return api_errors.ErrMissingRequest
	}

	if present > 1 {
		return api_errors.ErrTooManySpecifiers
	}

	err := api.ValidateUsername(handle.req.Username)
	if err != nil {
		return err
	}

	err = api.ValidateEmail(handle.req.Email)
	if err != nil {
		return err
	}

	if handle.req.Device == "" {
		return errors.New("device must be specified to delete 2FA tokens")
	}

	if handle.req.Password == "" {
		return errors.New("password must be specified to delete 2FA tokens")
	}

	return nil
}

func (handle *DeleteTOTPHandler) ServeErrableHTTP(w http.ResponseWriter, r *http.Request) error {
	err := handle.verifyRequest()
	if err != nil {
		return hwaterr.WrapError(err, http.StatusBadRequest)
	}

	if handle.req.UserID != 0 && handle.req.UserID != handle.user.ID {
		return hwaterr.WrapError(api_errors.ErrAccessDenied, http.StatusUnauthorized)
	}

	if handle.req.Username != "" && (!handle.user.Username.Valid || handle.req.Username != handle.user.Username.String) {
		return hwaterr.WrapError(api_errors.ErrAccessDenied, http.StatusUnauthorized)
	}

	if handle.req.Email != "" && (!handle.user.Email.Valid || handle.req.Email != handle.user.Email.String) {
		return hwaterr.WrapError(api_errors.ErrAccessDenied, http.StatusUnauthorized)
	}

	if err := database.InTransaction(func(tx *gorm.DB) error {
		log.Println("Got password:", handle.req.Password)
		if err := handle.user.ComparePassword(tx, handle.req.Password); err != nil {
			return err
		}

		return handle.user.RemoveTOTP(tx, handle.req.Device)
	}); err != nil {
		return err
	}

	handle.resp.Device = handle.req.Device
	handle.resp.Removed = true

	utils.SendResponse(w, r, handle)
	return nil
}
