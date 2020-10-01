package user

import (
	"log"
	"net/http"

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
	user *models.UserModel
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

func (handle *UpgradeHandler) SetUser(user *models.UserModel) {
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

	tx, err := database.GetTransaction()
	if err != nil {
		log.Print("Error during database.GetTransaction", err)
		return err
	}

	if handle.req.Username != "" {
		handle.user.Username = handle.req.Username
	}

	if handle.req.Email != "" {
		handle.user.Email = handle.req.Email
	}

	if handle.req.Display != "" {
		handle.user.Display = handle.req.Display
	} else if handle.req.Username != "" {
		handle.user.Display = handle.req.Username
	}

	handle.user.Guest = false

	err = handle.user.SetPassword(tx, handle.req.Password)
	if err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			log.Print("Unable to rollback:", rollbackErr)
		}

		log.Print("Unable to set password:", err)
		return err
	}

	err = handle.user.Save(tx)
	if err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			log.Print("Unable to rollback:", rollbackErr)
		}

		log.Print("Unable to save user:", err)
		return err
	}

	// Invalid
	var auth models.AuthModel
	auth.APIToken = handle.req.APIToken

	err = auth.Invalidate(tx)
	if err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			log.Print("Unable to rollback:", rollbackErr)
		}

		log.Print("Unable to save user:", err)
		return err
	}

	err = tx.Commit()
	if err != nil {
		log.Print("Error during tx.Commit()", err)
		return err
	}

	handle.resp.UserID = handle.user.ID
	handle.resp.Username = handle.user.Username
	handle.resp.Display = handle.user.Display
	handle.resp.Email = handle.user.Email
	handle.resp.Guest = handle.user.Guest

	log.Println("Handle", handle.resp)

	utils.SendResponse(w, r, &handle)
	return nil
}
