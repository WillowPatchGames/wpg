package user

import (
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

type upgradeHandlerData struct {
	UserID   uint64 `json:"id,omitempty" query:"id,omitempty" route:"UserID,omitempty"`
	Username string `json:"username,omitempty"`
	Email    string `json:"email,omitempty"`
	Display  string `json:"display,omitempty"`
	Password string `json:"password,omitempty"`
	APIToken string `json:"api_token,omitempty" header:"X-Auth-Token,omitempty" query:"api_token,omitempty"`
}

type upgradeHandlerResponse struct {
	UserID   uint64 `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Display  string `json:"display"`
	Guest    bool   `json:"guest"`
}

type UpgradeHandler struct {
	auth.Authed
	hwaterr.ErrableHandler
	utils.HTTPRequestHandler

	req  upgradeHandlerData
	resp upgradeHandlerResponse
	user *database.User
}

func (handle UpgradeHandler) GetResponse() interface{} {
	return handle.resp
}

func (handle *UpgradeHandler) GetObjectPointer() interface{} {
	return &handle.req
}

func (handle *UpgradeHandler) GetToken() string {
	return handle.req.APIToken
}

func (handle *UpgradeHandler) SetUser(user *database.User) {
	handle.user = user
}

func (handle UpgradeHandler) verifyRequest() error {
	if handle.req.Username == "" && handle.req.Email == "" {
		return api_errors.ErrMissingUsernameOrEmail
	}

	if handle.req.Password == "" {
		return api_errors.ErrMissingPassword
	}

	if handle.req.Username == "" && handle.req.Display == "" {
		return api_errors.ErrMissingDisplay
	}

	if handle.user.ID != handle.req.UserID {
		return api_errors.ErrAccessDenied
	}

	if handle.req.Display == "" {
		handle.req.Display = handle.req.Username
	}

	err := api.ValidateUsername(handle.req.Username)
	if err != nil {
		return err
	}

	err = api.ValidateEmail(handle.req.Email)
	if err != nil {
		return err
	}

	err = api.ValidateDisplayName(handle.req.Display)
	if err != nil {
		return err
	}

	return nil
}

func (handle UpgradeHandler) ServeErrableHTTP(w http.ResponseWriter, r *http.Request) error {
	log.Print("Start UpgradeHandler.ServeHTTP()")
	err := handle.verifyRequest()
	if err != nil {
		log.Print("Error during verifyRequest:", err)
		return hwaterr.WrapError(err, http.StatusBadRequest)
	}

	if handle.req.Username != "" {
		handle.user.Username.Valid = true
		handle.user.Username.String = handle.req.Username
	}

	if handle.req.Email != "" {
		handle.user.Email.Valid = true
		handle.user.Email.String = handle.req.Email
	}

	if handle.req.Display != "" {
		handle.user.Display = handle.req.Display
	} else if handle.req.Username != "" {
		handle.user.Display = handle.req.Username
	}

	handle.user.Guest = false

	if err := database.InTransaction(func(tx *gorm.DB) error {
		if err := handle.user.SetPassword(tx, handle.req.Password); err != nil {
			return err
		}

		if err := tx.Save(handle.user).Error; err != nil {
			return err
		}

		return handle.user.InvalidateGuestTokens(tx)
	}); err != nil {
		return err
	}

	handle.resp.UserID = handle.user.ID
	if handle.user.Username.Valid {
		handle.resp.Username = handle.user.Username.String
	}
	handle.resp.Display = handle.user.Display
	if handle.user.Email.Valid {
		handle.resp.Email = handle.user.Email.String
	}
	handle.resp.Guest = handle.user.Guest

	utils.SendResponse(w, r, &handle)
	return nil
}
