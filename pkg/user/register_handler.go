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
}

type registerHandlerResponse struct {
	UserID   uint64 `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Display  string `json:"display"`
}

type RegisterHandler struct {
	http.Handler
	utils.HTTPRequestHandler
	parsel.Parseltongue

	req  registerHandlerData
	resp registerHandlerResponse

	requestType string
}

func (handle *RegisterHandler) GetRequest() interface{} {
	return &handle.req
}

func (handle RegisterHandler) GetResponse() interface{} {
	return handle.resp
}

func (handle RegisterHandler) GetRequestType() string {
	return handle.requestType
}

func (handle *RegisterHandler) SetRequestType(requestType string) {
	handle.requestType = requestType
}

func (handle *RegisterHandler) GetObjectPointer() interface{} {
	return handle.GetRequest()
}

func (handle RegisterHandler) verifyRequest() error {
	if handle.req.Username == "" || handle.req.Email == "" {
		return api_errors.ErrMissingUsernameOrEmail
	}

	if handle.req.Password == "" {
		return api_errors.ErrMissingPassword
	}

	return nil
}

func (handle RegisterHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	err := utils.ParseRequest(w, r, &handle)
	if err != nil {
		api_errors.WriteError(w, err, true)
		return
	}

	err = handle.verifyRequest()
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

	err = user.Create(tx)
	if err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			log.Print("Unable to rollback:", rollbackErr)
		}

		api_errors.WriteError(w, err, true)
		return
	}

	err = user.SetPassword(tx, handle.req.Password)
	if err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			log.Print("Unable to rollback:", rollbackErr)
		}

		api_errors.WriteError(w, err, true)
		return
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

	utils.SendResponse(w, r, &handle)
}
