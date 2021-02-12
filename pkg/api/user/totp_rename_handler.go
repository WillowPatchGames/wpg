package user

import (
	"errors"
	"net/http"

	"gorm.io/gorm"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
	"git.cipherboy.com/WillowPatchGames/wpg/internal/utils"

	"git.cipherboy.com/WillowPatchGames/wpg/pkg/api"
	api_errors "git.cipherboy.com/WillowPatchGames/wpg/pkg/errors"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/auth"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/hwaterr"
)

type RenameTOTPHandlerData struct {
	UserID   uint64 `json:"id,omitempty" query:"id,omitempty" route:"UserID,omitempty"`
	Username string `json:"username,omitempty" query:"username,omitempty" route:"Username,omitempty"`
	Email    string `json:"email,omitempty" query:"email,omitempty" route:"Email,omitempty"`
	Device   string `json:"device,omitempty" query:"device,omitempty" route:"Device,omitempty"`
	Future   string `json:"future,omitempty" query:"future,omitempty" route:"Future,omitempty"`
	Token    string `json:"token,omitempty" query:"token,omitempty"`
	Password string `json:"password"`
	APIToken string `json:"api_token,omitempty" header:"X-Auth-Token,omitempty" query:"api_token,omitempty"`
}

type RenameTOTPHandlerResponse struct {
	Device  string `json:"device"`
	Renamed bool   `json:"renamed"`
}

type RenameTOTPHandler struct {
	auth.Authed
	hwaterr.ErrableHandler
	utils.HTTPRequestHandler

	req  RenameTOTPHandlerData
	resp RenameTOTPHandlerResponse
	user *database.User
}

func (handle RenameTOTPHandler) GetResponse() interface{} {
	return handle.resp
}

func (handle *RenameTOTPHandler) GetObjectPointer() interface{} {
	return &handle.req
}

func (handle *RenameTOTPHandler) GetToken() string {
	return handle.req.APIToken
}

func (handle *RenameTOTPHandler) SetUser(user *database.User) {
	handle.user = user
}

func (handle RenameTOTPHandler) verifyRequest() error {
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
		return errors.New("device must be specified to rename 2FA tokens")
	}

	if handle.req.Future == "" {
		return errors.New("future name must be specified to rename 2FA tokens")
	}

	if handle.req.Future == handle.req.Device {
		return errors.New("unable to rename device to its current name")
	}

	return nil
}

func (handle *RenameTOTPHandler) ServeErrableHTTP(w http.ResponseWriter, r *http.Request) error {
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
		return handle.user.RenameTOTP(tx, handle.req.Device, handle.req.Future)
	}); err != nil {
		return err
	}

	handle.resp.Device = handle.req.Device
	handle.resp.Renamed = true

	utils.SendResponse(w, r, handle)
	return nil
}
