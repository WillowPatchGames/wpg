package user

import (
	"log"
	"net/http"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
	"git.cipherboy.com/WillowPatchGames/wpg/internal/models"
	"git.cipherboy.com/WillowPatchGames/wpg/internal/utils"

	"git.cipherboy.com/WillowPatchGames/wpg/pkg/api"
	api_errors "git.cipherboy.com/WillowPatchGames/wpg/pkg/errors"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/hwaterr"
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
	hwaterr.ErrableHandler
	utils.HTTPRequestHandler

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
	if (handle.req.Username == "" && handle.req.Email == "") && !handle.req.Guest {
		return api_errors.ErrMissingUsernameOrEmail
	}

	if handle.req.Password == "" && !handle.req.Guest {
		return api_errors.ErrMissingPassword
	}

	if handle.req.Username == "" && handle.req.Display == "" && handle.req.Guest {
		return api_errors.ErrMissingDisplay
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

func (handle RegisterHandler) ServeErrableHTTP(w http.ResponseWriter, r *http.Request) error {
	err := handle.verifyRequest()
	if err != nil {
		log.Println("Got an error message: " + err.Error())
		return hwaterr.WrapError(err, http.StatusBadRequest)
	}

	tx, err := database.GetTransaction()
	if err != nil {
		return err
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

		return err
	}

	if user.Guest {
		var auth models.AuthModel
		err = auth.GuestToken(tx, user)

		if err != nil {
			if rollbackErr := tx.Rollback(); rollbackErr != nil {
				log.Print("Unable to rollback:", rollbackErr)
			}

			log.Println("")
			return err
		}

		handle.resp.Token = auth.APIToken
	} else {
		err = user.SetPassword(tx, handle.req.Password)
		if err != nil {
			if rollbackErr := tx.Rollback(); rollbackErr != nil {
				log.Print("Unable to rollback:", rollbackErr)
			}

			return err
		}
	}

	err = tx.Commit()
	if err != nil {
		return err
	}

	handle.resp.UserID = user.ID
	handle.resp.Username = user.Username
	handle.resp.Display = user.Display
	handle.resp.Email = user.Email
	handle.resp.Guest = user.Guest
	// handle.resp.Token set above if the user is a guest user.

	utils.SendResponse(w, r, &handle)
	return nil
}
