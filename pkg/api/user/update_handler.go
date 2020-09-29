package user

import (
	"errors"
	"log"
	"net/http"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
	"git.cipherboy.com/WillowPatchGames/wpg/internal/models"
	"git.cipherboy.com/WillowPatchGames/wpg/internal/utils"

	"git.cipherboy.com/WillowPatchGames/wpg/pkg/api"
	api_errors "git.cipherboy.com/WillowPatchGames/wpg/pkg/errors"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/auth"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/hwaterr"
)

type updateHandlerData struct {
	UserID   uint64   `json:"id,omitempty" query:"id,omitempty" route:"UserID,omitempty"`
	Email    string   `json:"email,omitempty"`
	Display  string   `json:"display,omitempty"`
	Old      string   `json:"old_password,omitempty"`
	Password string   `json:"new_password,omitempty"`
	Fields   []string `json:"fields"`
	APIToken string   `json:"api_token,omitempty" header:"X-Auth-Token,omitempty" query:"api_token,omitempty"`
}

type updateHandlerResponse struct {
	UserID   uint64                  `json:"id"`
	Username string                  `json:"username,omitempty"`
	Display  string                  `json:"display"`
	Email    string                  `json:"email,omitempty"`
	Guest    bool                    `json:"guest"`
	Config   *models.UserConfigModel `json:"config,omitempty"`
}

type UpdateHandler struct {
	auth.Authed
	hwaterr.ErrableHandler
	utils.HTTPRequestHandler

	req  updateHandlerData
	resp updateHandlerResponse
	user *models.UserModel
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

func (handle *UpdateHandler) SetUser(user *models.UserModel) {
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
		log.Println("Here")
		return hwaterr.WrapError(err, http.StatusBadRequest)
	}

	tx, err := database.GetTransaction()
	if err != nil {
		log.Println("Transaction?")
		return err
	}

	var user models.UserModel
	err = user.FromID(tx, handle.req.UserID)
	if err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			log.Print("Unable to rollback:", rollbackErr)
		}

		log.Println("Getting?", err)
		return err
	}

	err = api.UserCanModifyUser(*handle.user, user)
	if err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			log.Print("Unable to rollback:", rollbackErr)
		}

		log.Println("Not authorized?", err)
		return err
	}

	err = user.LoadConfig(tx)
	if err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			log.Print("Unable to rollback:", rollbackErr)
		}

		log.Println("Not authorized?", err)
		return err
	}

	var changePassword bool = false
Fields:
	for _, field := range handle.req.Fields {
		switch field {
		case "email":
			log.Println("Update email", user.Email, "->", handle.req.Email)
			if !user.Guest {
				user.Email = handle.req.Email
				user.Config.GravatarHash = utils.GravatarHash(user.Email)
			} else {
				err = errors.New("unable to change email on guest user account")
				break Fields
			}
		case "display":
			log.Println("Update display", user.Display, "->", handle.req.Display)
			err = api.ValidateDisplayName(handle.req.Display)
			if err == nil {
				user.Display = handle.req.Display
			} else {
				log.Println("Invalid display name:", err)
				break Fields
			}
		case "password", "old_password", "new_password":
			log.Println("Update password...")
			if !user.Guest {
				changePassword = true
			} else {
				err = errors.New("unable to change password on guest user account")
				break Fields
			}
		default:
			log.Println("Field:", field)
			err = api_errors.ErrMissingRequest
		}
	}

	if err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			log.Print("Unable to rollback:", rollbackErr)
		}

		log.Println("Updating?", err)
		return err
	}

	if changePassword {
		err = user.ComparePassword(tx, handle.req.Old)
		if err != nil {
			if rollbackErr := tx.Rollback(); rollbackErr != nil {
				log.Print("Unable to rollback:", rollbackErr)
			}

			log.Println("Checking password?", err)
			return err
		}

		err = user.SetPassword(tx, handle.req.Password)
		if err != nil {
			if rollbackErr := tx.Rollback(); rollbackErr != nil {
				log.Print("Unable to rollback:", rollbackErr)
			}

			log.Println("Updating password", err)
			return err
		}
	}

	err = user.SetConfig(tx)
	if err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			log.Print("Unable to rollback:", rollbackErr)
		}

		log.Println("Set config?", err)
		return err
	}

	err = user.Save(tx)
	if err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			log.Print("Unable to rollback:", rollbackErr)
		}

		log.Println("Saving User?", err)
		return err
	}

	err = tx.Commit()
	if err != nil {
		log.Println("Commiting?")
		return err
	}

	handle.resp.UserID = user.ID
	handle.resp.Display = user.Display

	if handle.user != nil && handle.user.ID == user.ID {
		handle.resp.Guest = user.Guest
		if !user.Guest {
			handle.resp.Username = user.Username
			handle.resp.Email = user.Email
		}
	}

	if !user.Guest {
		handle.resp.Config = user.Config
	}

	utils.SendResponse(w, r, handle)
	return nil
}
