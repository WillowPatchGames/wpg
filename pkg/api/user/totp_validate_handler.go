package user

import (
	"errors"
	"net/http"

	"gorm.io/gorm"

	"github.com/pquerna/otp"
	"github.com/pquerna/otp/totp"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
	"git.cipherboy.com/WillowPatchGames/wpg/internal/utils"

	"git.cipherboy.com/WillowPatchGames/wpg/pkg/api"
	api_errors "git.cipherboy.com/WillowPatchGames/wpg/pkg/errors"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/auth"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/hwaterr"
)

type validateTOTPHandlerData struct {
	UserID   uint64 `json:"id,omitempty" query:"id,omitempty" route:"UserID,omitempty"`
	Username string `json:"username,omitempty" query:"username,omitempty" route:"Username,omitempty"`
	Email    string `json:"email,omitempty" query:"email,omitempty" route:"Email,omitempty"`
	Device   string `json:"device,omitempty" query:"device,omitempty" route:"Device,omitempty"`
	Token    string `json:"token,omitempty" query:"token,omitempty"`
	APIToken string `json:"api_token,omitempty" header:"X-Auth-Token,omitempty" query:"api_token,omitempty"`
}

type validateTOTPHandlerResponse struct {
	Device    string `json:"device"`
	Validated bool   `json:"validated"`
}

type ValidateTOTPHandler struct {
	auth.Authed
	hwaterr.ErrableHandler
	utils.HTTPRequestHandler

	req  validateTOTPHandlerData
	resp validateTOTPHandlerResponse
	user *database.User
}

func (handle ValidateTOTPHandler) GetResponse() interface{} {
	return handle.resp
}

func (handle *ValidateTOTPHandler) GetObjectPointer() interface{} {
	return &handle.req
}

func (handle *ValidateTOTPHandler) GetToken() string {
	return handle.req.APIToken
}

func (handle *ValidateTOTPHandler) SetUser(user *database.User) {
	handle.user = user
}

func (handle ValidateTOTPHandler) verifyRequest() error {
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

	return nil
}

func (handle *ValidateTOTPHandler) ServeErrableHTTP(w http.ResponseWriter, r *http.Request) error {
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
		secret_url, err := handle.user.GetTOTPKey(tx, handle.req.Device, true)
		if err != nil {
			return err
		}

		key, err := otp.NewKeyFromURL(secret_url)
		if err != nil {
			return err
		}

		handle.resp.Validated = totp.Validate(handle.req.Token, key.Secret())
		if handle.resp.Validated {
			return handle.user.MarkTOTPVerified(tx, handle.req.Device, key.Secret())
		}

		return errors.New("TOTP tokens don't match expectations")
	}); err != nil {
		return err
	}

	handle.resp.Device = handle.req.Device

	utils.SendResponse(w, r, handle)
	return nil
}
