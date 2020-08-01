package auth

import (
	"log"
	"net/http"

	api_errors "git.cipherboy.com/WordCorp/api/pkg/errors"
	"git.cipherboy.com/WordCorp/api/pkg/middleware/parsel"

	"git.cipherboy.com/WordCorp/api/internal/database"
	"git.cipherboy.com/WordCorp/api/internal/models"
)

type Authed interface {
	http.Handler
	parsel.Parseltongue

	GetToken() string
	SetUser(user *models.UserModel)
}

func Wrap(handler Authed) parsel.Parseltongue {
	var ret = new(authMW)
	ret.next = handler
	return ret
}

type authMW struct {
	http.Handler
	parsel.Parseltongue

	next Authed
}

func (a *authMW) GetObjectPointer() interface{} {
	return a.next.GetObjectPointer()
}

func (a *authMW) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	tx, err := database.GetTransaction()
	if err != nil {
		log.Println("Authed: Begin transaction?", err)
		api_errors.WriteError(w, err, true)
		return
	}

	var token string = a.next.GetToken()
	log.Println("Got token: " + token)

	var user models.UserModel
	err = user.FromAPIToken(tx, token)
	if err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			log.Print("Authed: Unable to rollback:", rollbackErr)
		}

		log.Println("Authed: Getting user?", err)
		api_errors.WriteError(w, err, true)
		return
	}

	err = tx.Commit()
	if err != nil {
		log.Println("Authed: Commit transaction?", err)
		api_errors.WriteError(w, err, true)
		return
	}

	a.next.SetUser(&user)

	a.next.ServeHTTP(w, r)
}
