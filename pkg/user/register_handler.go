package user

import (
	"log"
	"net/http"

	"git.cipherboy.com/WordCorp/api/internal/database"
	"git.cipherboy.com/WordCorp/api/internal/models"
	"git.cipherboy.com/WordCorp/api/internal/utils"

	api_errors "git.cipherboy.com/WordCorp/api/pkg/errors"
	"git.cipherboy.com/WordCorp/api/pkg/middleware/parsel"
)

type registerHandlerData struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Display  string `json:"display"`
	Password string `json:"password"`
	Guest    bool   `json:"guest"`
}

type registerHandlerResponse struct {
	UserID   uint64 `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Display  string `json:"display"`
	Guest    bool   `json:"guest"`
	Token    string `json:"token,omitempty"`
}

type RegisterHandler struct {
	http.Handler
	utils.HTTPRequestHandler
	parsel.Parseltongue

	req  registerHandlerData
	resp registerHandlerResponse
}

func (handle RegisterHandler) GetResponse() interface{} {
	return handle.resp
}

func (handle *RegisterHandler) GetObjectPointer() interface{} {
	return &handle.req
}

func (handle RegisterHandler) verifyRequest() error {
	if (handle.req.Username == "" || handle.req.Email == "") && !handle.req.Guest {
		return api_errors.ErrMissingUsernameOrEmail
	}

	if handle.req.Password == "" && !handle.req.Guest {
		return api_errors.ErrMissingPassword
	}

	return nil
}

func (handle RegisterHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	err := handle.verifyRequest()
	if err != nil {
		api_errors.WriteError(w, err, true)
		return
	}

	tx, err := database.GetTransaction()
	if err != nil {
		api_errors.WriteError(w, err, true)
		return
	}

	var user models.UserModel
	user.Username = handle.req.Username
	user.Email = handle.req.Email
	user.Display = handle.req.Display
	if user.Display == "" && user.Username != "" {
		user.Display = user.Username
	}
	user.Guest = handle.req.Guest

	err = user.Create(tx)
	if err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			log.Print("Unable to rollback:", rollbackErr)
		}

		api_errors.WriteError(w, err, true)
		return
	}

	if user.Guest {
		var auth models.AuthModel
		err = auth.GuestToken(tx, user)

		if err != nil {
			if rollbackErr := tx.Rollback(); rollbackErr != nil {
				log.Print("Unable to rollback:", rollbackErr)
			}

			log.Println("")
			api_errors.WriteError(w, err, true)
			return
		}

		handle.resp.Token = auth.ApiToken
	} else {
		err = user.SetPassword(tx, handle.req.Password)
		if err != nil {
			if rollbackErr := tx.Rollback(); rollbackErr != nil {
				log.Print("Unable to rollback:", rollbackErr)
			}

			api_errors.WriteError(w, err, true)
			return
		}
	}

	err = tx.Commit()
	if err != nil {
		api_errors.WriteError(w, err, true)
		return
	}

	handle.resp.UserID = user.Eid
	handle.resp.Username = user.Username
	handle.resp.Display = user.Display
	handle.resp.Email = user.Email
	handle.resp.Guest = user.Guest
	// handle.resp.Token set above if the user is a guest user.

	utils.SendResponse(w, r, &handle)
}
