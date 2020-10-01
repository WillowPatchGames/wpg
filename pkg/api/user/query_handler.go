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

type queryHandlerData struct {
	UserID   uint64 `json:"id,omitempty" query:"id,omitempty" route:"UserID,omitempty"`
	Username string `json:"username,omitempty" query:"username,omitempty" route:"Username,omitempty"`
	Email    string `json:"email,omitempty" query:"email,omitempty" route:"Email,omitempty"`
	APIToken string `json:"api_token,omitempty" header:"X-Auth-Token,omitempty" query:"api_token,omitempty"`
}

type queryHandlerResponse struct {
	UserID   uint64               `json:"id"`
	Username string               `json:"username,omitempty"`
	Display  string               `json:"display"`
	Email    string               `json:"email,omitempty"`
	Guest    bool                 `json:"guest"`
	Config   *database.UserConfig `json:"config,omitempty"`
}

type QueryHandler struct {
	auth.Authed
	hwaterr.ErrableHandler
	utils.HTTPRequestHandler

	req  queryHandlerData
	resp queryHandlerResponse
	user *database.User
}

func (handle QueryHandler) GetResponse() interface{} {
	return handle.resp
}

func (handle *QueryHandler) GetObjectPointer() interface{} {
	return &handle.req
}

func (handle *QueryHandler) GetToken() string {
	return handle.req.APIToken
}

func (handle *QueryHandler) SetUser(user *database.User) {
	handle.user = user
}

func (handle QueryHandler) verifyRequest() error {
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

func (handle *QueryHandler) ServeErrableHTTP(w http.ResponseWriter, r *http.Request) error {
	err := handle.verifyRequest()
	if err != nil {
		log.Println("Here")
		return hwaterr.WrapError(err, http.StatusBadRequest)
	}

	var user database.User

	if err := database.InTransaction(func(tx *gorm.DB) error {
		if handle.req.UserID != 0 {
			if err := tx.Preload("UserConfig").First(&user, handle.req.UserID).Error; err != nil {
				return err
			}
		} else if handle.req.Username != "" {
			if err := tx.Preload("UserConfig").First(&user, "username = ?", handle.req.Username).Error; err != nil {
				return err
			}
		} else if handle.req.Email != "" {
			if err := tx.Preload("UserConfig").First(&user, "email = ?", handle.req.Email).Error; err != nil {
				return err
			}
		}
	}); err != nil {
		return err
	}

	handle.resp.UserID = user.ID
	handle.resp.Display = user.Display

	if handle.user != nil && handle.user.ID == user.ID {
		handle.resp.Guest = user.Guest
		if !user.Guest {
			if user.Username.Valid {
				handle.resp.Username = user.Username.String
			}
			if user.Email.Valid {
				handle.resp.Email = user.Email.String
			}
		}
	}

	if !user.Guest {
		handle.resp.Config = &user.Config
	}

	utils.SendResponse(w, r, handle)
	return nil
}
