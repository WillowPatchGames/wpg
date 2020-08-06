package user

import (
	"log"
	"net/http"

	"git.cipherboy.com/WordCorp/api/internal/database"
	"git.cipherboy.com/WordCorp/api/internal/models"
	"git.cipherboy.com/WordCorp/api/internal/utils"

	api_errors "git.cipherboy.com/WordCorp/api/pkg/errors"
	"git.cipherboy.com/WordCorp/api/pkg/middleware/auth"
	"git.cipherboy.com/WordCorp/api/pkg/middleware/parsel"
)

type upgradeHandlerData struct {
	UserID   uint64 `json:"id,omitempty" query:"id,omitempty" route:"UserID,omitempty"`
	Username string `json:"username,omitempty"`
	Email    string `json:"email,omitempty"`
	Display  string `json:"display,omitempty"`
	Password string `json:"password,omitempty"`
	ApiToken string `json:"api_token,omitempty" header:"X-Auth-Token,omitempty" query:"api_token,omitempty"`
}

type upgradeHandlerResponse struct {
	UserID   uint64 `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Display  string `json:"display"`
	Guest    bool   `json:"guest"`
}

type UpgradeHandler struct {
	http.Handler
	utils.HTTPRequestHandler
	parsel.Parseltongue
	auth.Authed

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
	return handle.req.ApiToken
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

	if handle.user.Eid != handle.req.UserID {
		return api_errors.ErrAccessDenied
	}

	return nil
}

func (handle UpgradeHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	log.Print("Start UpgradeHandler.ServeHTTP()")
	err := handle.verifyRequest()
	if err != nil {
		log.Print("Error during verifyRequest:", err)
		api_errors.WriteError(w, err, true)
		return
	}

	tx, err := database.GetTransaction()
	if err != nil {
		log.Print("Error during database.GetTransaction", err)
		api_errors.WriteError(w, err, true)
		return
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
		api_errors.WriteError(w, err, true)
		return
	}

	err = handle.user.Save(tx)
	if err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			log.Print("Unable to rollback:", rollbackErr)
		}

		log.Print("Unable to save user:", err)
		api_errors.WriteError(w, err, true)
		return
	}

	// Invalid
	var auth models.AuthModel
	auth.ApiToken = handle.req.ApiToken

	err = auth.Invalidate(tx)
	if err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			log.Print("Unable to rollback:", rollbackErr)
		}

		log.Print("Unable to save user:", err)
		api_errors.WriteError(w, err, true)
		return
	}

	err = tx.Commit()
	if err != nil {
		log.Print("Error during tx.Commit()", err)
		api_errors.WriteError(w, err, true)
		return
	}

	handle.resp.UserID = handle.user.Eid
	handle.resp.Username = handle.user.Username
	handle.resp.Display = handle.user.Display
	handle.resp.Email = handle.user.Email
	handle.resp.Guest = handle.user.Guest

	log.Println("Handle", handle.resp)

	utils.SendResponse(w, r, &handle)
}
