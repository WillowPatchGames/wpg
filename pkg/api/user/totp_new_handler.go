package user

import (
	"net/http"
	"strconv"

	"gorm.io/gorm"

	"github.com/pquerna/otp/totp"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
	"git.cipherboy.com/WillowPatchGames/wpg/internal/utils"

	"git.cipherboy.com/WillowPatchGames/wpg/pkg/api"
	api_errors "git.cipherboy.com/WillowPatchGames/wpg/pkg/errors"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/auth"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/hwaterr"
)

type newTOTPHandlerData struct {
	UserID   uint64 `json:"id,omitempty" query:"id,omitempty" route:"UserID,omitempty"`
	Username string `json:"username,omitempty" query:"username,omitempty" route:"Username,omitempty"`
	Email    string `json:"email,omitempty" query:"email,omitempty" route:"Email,omitempty"`
	Device   string `json:"device,omitempty" query:"device,omitempty" route:"Device,omitempty"`
	APIToken string `json:"api_token,omitempty" header:"X-Auth-Token,omitempty" query:"api_token,omitempty"`
}

type newTOTPHandlerResponse struct {
	Device string `json:"device"`
	Secret string `json:"secret"`
}

type NewTOTPHandler struct {
	auth.Authed
	hwaterr.ErrableHandler
	utils.HTTPRequestHandler

	req  newTOTPHandlerData
	resp newTOTPHandlerResponse
	user *database.User
}

func (handle NewTOTPHandler) GetResponse() interface{} {
	return handle.resp
}

func (handle *NewTOTPHandler) GetObjectPointer() interface{} {
	return &handle.req
}

func (handle *NewTOTPHandler) GetToken() string {
	return handle.req.APIToken
}

func (handle *NewTOTPHandler) SetUser(user *database.User) {
	handle.user = user
}

func (handle NewTOTPHandler) verifyRequest() error {
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

func (handle *NewTOTPHandler) ServeErrableHTTP(w http.ResponseWriter, r *http.Request) error {
	err := handle.verifyRequest()
	if err != nil {
		return hwaterr.WrapError(err, http.StatusBadRequest)
	}

	if handle.req.Device == "" {
		handle.req.Device = "primary"
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
		var name = handle.user.Display
		if handle.user.Username.Valid {
			name = handle.user.Username.String
		}
		if handle.user.Email.Valid {
			name = handle.user.Email.String
		}

		var opts = totp.GenerateOpts{
			Issuer:      "Willow Patch Games",
			AccountName: strconv.FormatUint(handle.user.ID, 10) + "::" + name,
		}

		key, err := totp.Generate(opts)
		if err != nil {
			return err
		}

		handle.resp.Secret = key.URL()

		// Save the URL while this is pending, then switch to only storing secret.
		return handle.user.SetTOTPKey(tx, handle.req.Device, key.URL(), true)
	}); err != nil {
		return err
	}

	handle.resp.Device = handle.req.Device

	utils.SendResponse(w, r, handle)
	return nil
}
