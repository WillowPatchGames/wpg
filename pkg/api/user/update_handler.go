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

type updateHandlerData struct {
	UserID   uint64   `json:"id,omitempty" query:"id,omitempty" route:"UserID,omitempty"`
	Email    string   `json:"email,omitempty"`
	Display  string   `json:"display,omitempty"`
	Old      string   `json:"old_password,omitempty"`
	Password string   `json:"new_password,omitempty"`
	Fields   []string `json:"fields"`
	ApiToken string   `json:"api_token,omitempty" header:"X-Auth-Token,omitempty" query:"api_token,omitempty"`
}

type updateHandlerResponse struct {
	UserID   uint64 `json:"id"`
	Username string `json:"username,omitempty"`
	Display  string `json:"display,omitempty"`
	Email    string `json:"email,omitempty"`
	Guest    bool   `json:"guest"`
}

type UpdateHandler struct {
	http.Handler
	utils.HTTPRequestHandler
	parsel.Parseltongue
	auth.Authed

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
	return handle.req.ApiToken
}

func (handle *UpdateHandler) SetUser(user *models.UserModel) {
	handle.user = user
}

func (handle UpdateHandler) verifyRequest() error {
	if handle.req.UserID == 0 {
		return api_errors.ErrMissingRequest
	}

	if handle.req.UserID != handle.user.Id {
		return api_errors.ErrAccessDenied
	}

	if (handle.req.Old != "" || handle.req.Password != "") && (handle.req.Old == "" || handle.req.Password == "") {
		return api_errors.ErrMissingPassword
	}

	return nil
}

func (handle *UpdateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
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
	err = user.FromId(tx, handle.req.UserID)
	if err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			log.Print("Unable to rollback:", rollbackErr)
		}

		log.Println("Getting?", err)
		api_errors.WriteError(w, err, true)
		return
	}

	var change_password bool = false
	for _, field := range handle.req.Fields {
		switch field {
		case "email":
			log.Println("Update email ->", user.Email)
			user.Email = handle.req.Email
		case "display":
			log.Println("Update dispaly ->", user.Display)
			user.Display = handle.req.Display
		case "password", "old_password", "new_password":
			log.Println("Update password...")
			change_password = true
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
		api_errors.WriteError(w, err, true)
		return
	}

	if change_password {
		err = user.ComparePassword(tx, handle.req.Old)
		if err != nil {
			if rollbackErr := tx.Rollback(); rollbackErr != nil {
				log.Print("Unable to rollback:", rollbackErr)
			}

			log.Println("Checking password?", err)
			api_errors.WriteError(w, err, true)
			return
		}

		err = user.SetPassword(tx, handle.req.Password)
		if err != nil {
			if rollbackErr := tx.Rollback(); rollbackErr != nil {
				log.Print("Unable to rollback:", rollbackErr)
			}

			log.Println("Updating password", err)
			api_errors.WriteError(w, err, true)
			return
		}
	}

	err = user.Save(tx)
	if err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			log.Print("Unable to rollback:", rollbackErr)
		}

		log.Println("Saving User?", err)
		api_errors.WriteError(w, err, true)
		return
	}

	err = tx.Commit()
	if err != nil {
		log.Println("Commiting?")
		api_errors.WriteError(w, err, true)
		return
	}

	handle.resp.UserID = user.Id
	handle.resp.Display = user.Display

	if handle.user != nil && handle.user.Id == user.Id {
		handle.resp.Username = user.Username
		handle.resp.Email = user.Email
		handle.resp.Guest = user.Guest
	}

	utils.SendResponse(w, r, handle)
}
