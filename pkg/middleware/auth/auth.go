package auth

import (
	"log"
	"net/http"

	api_errors "git.cipherboy.com/WillowPatchGames/wpg/pkg/errors"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/parsel"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
	"git.cipherboy.com/WillowPatchGames/wpg/internal/models"
)

type Authed interface {
	http.Handler
	parsel.Parseltongue

	GetToken() string
	SetUser(user *models.UserModel)
}

func Require(handler Authed) parsel.Parseltongue {
	var ret = new(authMW)
	ret.next = handler
	ret.requireAuth = true
	return ret
}

func Allow(handler Authed) parsel.Parseltongue {
	var ret = new(authMW)
	ret.next = handler
	ret.requireAuth = false
	return ret
}

type authMW struct {
	http.Handler
	parsel.Parseltongue

	next        Authed
	requireAuth bool
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

	var user *models.UserModel = new(models.UserModel)
	err = user.FromAPIToken(tx, token)
	if err != nil {
		user = nil
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			log.Print("Authed: Unable to rollback:", rollbackErr)
		}

		log.Println("Authed: Getting user?", err)

		if !a.requireAuth {
			log.Println("Authed: Required auth, so returning error")
			api_errors.WriteError(w, err, true)
			return
		}
	}

	err = tx.Commit()
	if err != nil {
		log.Println("Authed: Commit transaction?", err)
		api_errors.WriteError(w, err, true)
		return
	}

	a.next.SetUser(user)

	a.next.ServeHTTP(w, r)
}
