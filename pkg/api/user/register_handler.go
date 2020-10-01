package user

import (
	"log"
	"net/http"

	"gorm.io/gorm"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
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
	UserID   uint64               `json:"id"`
	Username string               `json:"username,omitempty"`
	Email    string               `json:"email,omitempty"`
	Display  string               `json:"display"`
	Guest    bool                 `json:"guest"`
	Token    string               `json:"token,omitempty"`
	Config   *database.UserConfig `json:"config,omitempty"`
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

	var user database.User
	var auth database.Auth

	if err := database.InTransaction(func(tx *gorm.DB) error {
		user.Display = handle.req.Display

		if user.Display == "" && handle.req.Username != "" {
			user.Display = handle.req.Username
		}

		user.Guest = handle.req.Guest
		if !user.Guest {
			// Only set email and username on non-guest accounts
			if handle.req.Email != "" {
				user.Email.Valid = true
				user.Email.String = handle.req.Email
			}

			if handle.req.Username != "" {
				user.Username.Valid = true
				user.Username.String = handle.req.Username
			}

			if user.Email.Valid {
				user.Config.GravatarHash.Valid = true
				user.Config.GravatarHash.String = utils.GravatarHash(user.Email.String)
			}
		}

		if err := tx.Create(&user).Error; err != nil {
			return err
		}

		if user.Guest {
			if err := database.GuestToken(tx, &user, &auth); err != nil {
				return err
			}

			handle.resp.Token = auth.Key
		} else {
			if err := database.SetPassword(tx, &user, handle.req.Password); err != nil {
				return err
			}
		}

		return nil
	}); err != nil {
		return err
	}

	handle.resp.UserID = user.ID
	handle.resp.Display = user.Display
	handle.resp.Guest = user.Guest
	if !user.Guest {
		handle.resp.Config = &user.Config
		if user.Username.Valid {
			handle.resp.Username = user.Username.String
		}
		if user.Email.Valid {
			handle.resp.Email = user.Email.String
		}
	}
	// handle.resp.Token set above if the user is a guest user.

	utils.SendResponse(w, r, &handle)
	return nil
}
