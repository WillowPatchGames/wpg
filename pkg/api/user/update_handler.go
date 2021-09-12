package user

import (
	"errors"
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

type updateHandlerData struct {
	UserID               uint64   `json:"id,omitempty" query:"id,omitempty" route:"UserID,omitempty"`
	Email                string   `json:"email,omitempty"`
	Display              string   `json:"display,omitempty"`
	Old                  string   `json:"old_password,omitempty"`
	Password             string   `json:"new_password,omitempty"`
	TurnPushNotification bool     `json:"turn_push_notification,omitempty"`
	TurnHapticFeedback   bool     `json:"turn_haptic_feedback,omitempty"`
	Fields               []string `json:"fields"`
	APIToken             string   `json:"api_token,omitempty" header:"X-Auth-Token,omitempty" query:"api_token,omitempty"`
}

type updateHandlerResponse struct {
	UserID   uint64          `json:"id"`
	Username string          `json:"username,omitempty"`
	Display  string          `json:"display"`
	Email    string          `json:"email,omitempty"`
	Guest    bool            `json:"guest"`
	Config   *JSONUserConfig `json:"config,omitempty"`
}

type UpdateHandler struct {
	auth.Authed
	hwaterr.ErrableHandler
	utils.HTTPRequestHandler

	req  updateHandlerData
	resp updateHandlerResponse
	user *database.User
}

func (handle UpdateHandler) GetResponse() interface{} {
	return handle.resp
}

func (handle *UpdateHandler) GetObjectPointer() interface{} {
	return &handle.req
}

func (handle *UpdateHandler) GetToken() string {
	return handle.req.APIToken
}

func (handle *UpdateHandler) SetUser(user *database.User) {
	handle.user = user
}

func (handle UpdateHandler) verifyRequest() error {
	if handle.req.UserID == 0 {
		return api_errors.ErrMissingRequest
	}

	if handle.req.UserID != handle.user.ID {
		return api_errors.ErrAccessDenied
	}

	if (handle.req.Old != "" || handle.req.Password != "") && (handle.req.Old == "" || handle.req.Password == "") {
		return api_errors.ErrMissingPassword
	}

	err := api.ValidateEmail(handle.req.Email)
	if err != nil {
		return err
	}

	// api.ValidateDisplayName() can't be called here because we haven't
	// parsed which fields to expect. If "display" is expected, it'll be
	// non-empty, but otherwise handle.req.Display will be empty. The latter
	// throws a validation error.

	return nil
}

func (handle *UpdateHandler) ServeErrableHTTP(w http.ResponseWriter, r *http.Request) error {
	err := handle.verifyRequest()
	if err != nil {
		return hwaterr.WrapError(err, http.StatusBadRequest)
	}

	var user database.User

	if err := database.InTransaction(func(tx *gorm.DB) error {
		if err := tx.Preload("Config").First(&user, handle.req.UserID).Error; err != nil {
			return err
		}

		if err := api.UserCanModifyUser(*handle.user, user); err != nil {
			return err
		}

		var changePassword bool = false
	Fields:
		for _, field := range handle.req.Fields {
			switch field {
			case "email":
				if user.Guest {
					err = errors.New("unable to change email on guest user account")
					break Fields
				}

				database.SetSQLFromString(&user.Email, handle.req.Email)
				if user.Email.Valid {
					user.Config.GravatarHash.Valid = true
					user.Config.GravatarHash.String = utils.GravatarHash(handle.req.Email)
				} else {
					user.Config.GravatarHash.Valid = false
				}
			case "display":
				err = api.ValidateDisplayName(handle.req.Display)
				if err != nil {
					log.Println("Invalid display name:", err)
					break Fields
				}

				user.Display = handle.req.Display
			case "password", "old_password", "new_password":
				if user.Guest {
					err = errors.New("unable to change password on guest user account")
					break Fields
				}

				changePassword = true
			case "turn_push_notification":
				user.Config.TurnPushNotification.Valid = true
				user.Config.TurnPushNotification.Bool = handle.req.TurnPushNotification
			case "turn_haptic_feedback":
				user.Config.TurnHapticFeedback.Valid = true
				user.Config.TurnHapticFeedback.Bool = handle.req.TurnHapticFeedback
			default:
				log.Println("Unknown field to update in room:", field)
				err = api_errors.ErrMissingRequest
			}

			if err != nil {
				return err
			}
		}

		if changePassword {
			if err := user.ComparePassword(tx, handle.req.Old); err != nil {
				return err
			}

			if err := user.SetPassword(tx, handle.req.Password); err != nil {
				return err
			}
		}

		if !user.Config.GravatarHash.Valid {
			user.Config.GravatarHash.Valid = true
			user.Config.GravatarHash.String = utils.GravatarHash(user.Display)
		}

		if err := tx.Save(&user.Config).Error; err != nil {
			return err
		}

		return tx.Save(&user).Error
	}); err != nil {
		return err
	}

	handle.resp.UserID = user.ID
	handle.resp.Display = user.Display

	if handle.user != nil && handle.user.ID == user.ID {
		handle.resp.Guest = user.Guest
		if !user.Guest {
			database.SetStringFromSQL(&handle.resp.Username, user.Username)
			database.SetStringFromSQL(&handle.resp.Email, user.Email)
		}
	}

	handle.resp.Config = FromConfigModel(user.Config, handle.user != nil && handle.user.ID == user.ID)

	utils.SendResponse(w, r, handle)
	return nil
}
