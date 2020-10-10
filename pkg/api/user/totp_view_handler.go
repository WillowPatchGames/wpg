package user

import (
	"image/png"
	"net/http"

	"gorm.io/gorm"

	"github.com/pquerna/otp"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"

	"git.cipherboy.com/WillowPatchGames/wpg/pkg/api"
	api_errors "git.cipherboy.com/WillowPatchGames/wpg/pkg/errors"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/auth"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/hwaterr"
)

type viewTOTPHandlerData struct {
	UserID   uint64 `json:"id,omitempty" query:"id,omitempty" route:"UserID,omitempty"`
	Username string `json:"username,omitempty" query:"username,omitempty" route:"Username,omitempty"`
	Email    string `json:"email,omitempty" query:"email,omitempty" route:"Email,omitempty"`
	Device   string `json:"device,omitempty" query:"device,omitempty" route:"Device,omitempty"`
	APIToken string `json:"api_token,omitempty" header:"X-Auth-Token,omitempty" query:"api_token,omitempty"`
}

type ViewTOTPHandler struct {
	auth.Authed
	hwaterr.ErrableHandler

	req  viewTOTPHandlerData
	user *database.User
}

func (handle *ViewTOTPHandler) GetObjectPointer() interface{} {
	return &handle.req
}

func (handle *ViewTOTPHandler) GetToken() string {
	return handle.req.APIToken
}

func (handle *ViewTOTPHandler) SetUser(user *database.User) {
	handle.user = user
}

func (handle ViewTOTPHandler) verifyRequest() error {
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

func (handle *ViewTOTPHandler) ServeErrableHTTP(w http.ResponseWriter, r *http.Request) error {
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

		key_image, err := key.Image(512, 512)
		if err != nil {
			return err
		}

		w.Header().Set("Content-Type", "image/png")
		return png.Encode(w, key_image)
	}); err != nil {
		return err
	}

	return nil
}
