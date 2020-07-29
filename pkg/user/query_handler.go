package user

import (
	"log"
	"net/http"

	"git.cipherboy.com/WordCorp/api/internal/database"
	"git.cipherboy.com/WordCorp/api/internal/models"
	"git.cipherboy.com/WordCorp/api/internal/utils"

	api_errors "git.cipherboy.com/WordCorp/api/pkg/errors"
)

type queryHandlerData struct {
	UserID   uint64 `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
}

type queryHandlerResponse struct {
	UserID   uint64 `json:"id"`
	Username string `json:"username"`
	Display  string `json:"display"`
	Email    string `json:"email"`
}

type QueryHandler struct {
	http.Handler
	utils.HTTPRequestHandler

	req  queryHandlerData
	resp queryHandlerResponse

	requestType string
}

func (handle *QueryHandler) GetRequest() interface{} {
    return &handle.req
}

func (handle QueryHandler) GetResponse() interface{} {
    return handle.resp
}

func (handle QueryHandler) GetRequestType() string {
    return handle.requestType
}

func (handle *QueryHandler) SetRequestType(requestType string) {
    handle.requestType = requestType
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

func (handle QueryHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
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
