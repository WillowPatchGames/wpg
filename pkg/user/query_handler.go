package user

import (
	"log"
	"net/http"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
	"git.cipherboy.com/WillowPatchGames/wpg/internal/models"
	"git.cipherboy.com/WillowPatchGames/wpg/internal/utils"

	api_errors "git.cipherboy.com/WillowPatchGames/wpg/pkg/errors"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/auth"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/parsel"
)

type queryHandlerData struct {
	UserID   uint64 `json:"id,omitempty" query:"id,omitempty" route:"UserID,omitempty"`
	Username string `json:"username,omitempty" query:"username,omitempty" route:"Username,omitempty"`
	Email    string `json:"email,omitempty" query:"email,omitempty" route:"Email,omitempty"`
	ApiToken string `json:"api_token,omitempty" header:"X-Auth-Token,omitempty" query:"api_token,omitempty"`
}

type queryHandlerResponse struct {
	UserID   uint64 `json:"id"`
	Username string `json:"username,omitempty"`
	Display  string `json:"display,omitempty"`
	Email    string `json:"email,omitempty"`
	Guest    bool   `json:"guest"`
}

type QueryHandler struct {
	http.Handler
	utils.HTTPRequestHandler
	parsel.Parseltongue
	auth.Authed

	req  queryHandlerData
	resp queryHandlerResponse
	user *models.UserModel
}

func (handle QueryHandler) GetResponse() interface{} {
	return handle.resp
}

func (handle *QueryHandler) GetObjectPointer() interface{} {
	return &handle.req
}

func (handle *QueryHandler) GetToken() string {
	return handle.req.ApiToken
}

func (handle *QueryHandler) SetUser(user *models.UserModel) {
	handle.user = user
}

func (handle QueryHandler) verifyRequest() error {
	var present int = 0

	if handle.req.UserID != 0 {
		present += 1
	}
	if handle.req.Username != "" {
		present += 1
	}
	if handle.req.Email != "" {
		present += 1
	}

	if present == 0 {
		return api_errors.ErrMissingRequest
	}

	if present > 1 {
		return api_errors.ErrTooManySpecifiers
	}

	return nil
}

func (handle *QueryHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	err := handle.verifyRequest()
	if err != nil {
		log.Println("Here")
		api_errors.WriteError(w, err, true)
		return
	}

	tx, err := database.GetTransaction()
	if err != nil {
		log.Println("Transaction?")
		api_errors.WriteError(w, err, true)
		return
	}

	var user models.UserModel
	if handle.req.UserID != 0 {
		err = user.FromEid(tx, handle.req.UserID)
	} else if handle.req.Username != "" {
		err = user.FromUsername(tx, handle.req.Username)
	} else if handle.req.Email != "" {
		err = user.FromEmail(tx, handle.req.Email)
	}

	if err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			log.Print("Unable to rollback:", rollbackErr)
		}

		log.Println("Getting?", err)
		api_errors.WriteError(w, err, true)
		return
	}

	err = tx.Commit()
	if err != nil {
		log.Println("Commiting?")
		api_errors.WriteError(w, err, true)
		return
	}

	handle.resp.UserID = user.Eid
	handle.resp.Display = user.Display

	if handle.user != nil && handle.user.Id == user.Id {
		handle.resp.Username = user.Username
		handle.resp.Email = user.Email
		handle.resp.Guest = user.Guest
	}

	utils.SendResponse(w, r, handle)
}
