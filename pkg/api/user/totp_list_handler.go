package user

import (
	"net/http"
	"strings"

	"gorm.io/gorm"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
	"git.cipherboy.com/WillowPatchGames/wpg/internal/utils"

	"git.cipherboy.com/WillowPatchGames/wpg/pkg/api"
	api_errors "git.cipherboy.com/WillowPatchGames/wpg/pkg/errors"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/auth"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/hwaterr"
)

type listTOTPHandlerData struct {
	UserID   uint64 `json:"id,omitempty" query:"id,omitempty" route:"UserID,omitempty"`
	Username string `json:"username,omitempty" query:"username,omitempty" route:"Username,omitempty"`
	Email    string `json:"email,omitempty" query:"email,omitempty" route:"Email,omitempty"`
	APIToken string `json:"api_token,omitempty" header:"X-Auth-Token,omitempty" query:"api_token,omitempty"`
}

type listTOTPHandlerResponse struct {
	Device    string `json:"device"`
	Validated bool   `json:"validated"`
}

type ListTOTPHandler struct {
	auth.Authed
	hwaterr.ErrableHandler
	utils.HTTPRequestHandler

	req  listTOTPHandlerData
	resp []listTOTPHandlerResponse
	user *database.User
}

func (handle ListTOTPHandler) GetResponse() interface{} {
	return handle.resp
}

func (handle *ListTOTPHandler) GetObjectPointer() interface{} {
	return &handle.req
}

func (handle *ListTOTPHandler) GetToken() string {
	return handle.req.APIToken
}

func (handle *ListTOTPHandler) SetUser(user *database.User) {
	handle.user = user
}

func (handle ListTOTPHandler) verifyRequest() error {
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

func (handle *ListTOTPHandler) ServeErrableHTTP(w http.ResponseWriter, r *http.Request) error {
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
		devices, err := handle.user.GetTOTPDevices(tx)
		if err != nil {
			return err
		}

		for _, device := range devices {
			var entry listTOTPHandlerResponse
			entry.Validated = strings.HasSuffix(device, "-key-pending")
			entry.Device = strings.TrimSuffix(strings.TrimSuffix(device, "-pending"), "-key")
			handle.resp = append(handle.resp, entry)
		}

		return nil
	}); err != nil {
		return err
	}

	utils.SendResponse(w, r, handle)
	return nil
}
