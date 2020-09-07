package auth

import (
	"log"
	"net/http"

	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/hwaterr"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/parsel"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
	"git.cipherboy.com/WillowPatchGames/wpg/internal/models"
)

type Authed interface {
	hwaterr.ErrableHandler

	GetToken() string
	SetUser(user *models.UserModel)
	GetObjectPointer() interface{}
}

func Require(handler Authed) parsel.Parseltongue {
	var ret = new(authMW)
	ret.next = handler
	ret.requireAuth = true
	return hwaterr.Wrap(ret)
}

func Allow(handler Authed) parsel.Parseltongue {
	var ret = new(authMW)
	ret.next = handler
	ret.requireAuth = false
	return hwaterr.Wrap(ret)
}

type authMW struct {
	hwaterr.ErrableHandler
	parsel.Parseltongue

	next        Authed
	requireAuth bool
}

func (a *authMW) GetObjectPointer() interface{} {
	return a.next.GetObjectPointer()
}

func (a *authMW) ServeErrableHTTP(w http.ResponseWriter, r *http.Request) error {
	tx, err := database.GetTransaction()
	if err != nil {
		log.Println("Authed: Begin transaction?", err)
		return err
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

		if a.requireAuth {
			log.Println("Authed: Required auth, so returning error")
			return err
		}
	} else {
		err = tx.Commit()
		if err != nil {
			log.Println("Authed: Commit transaction?", err)
			return err
		}
	}

	log.Println("Authed: OK as " + user.Display)
	a.next.SetUser(user)
	return a.next.ServeErrableHTTP(w, r)
}
