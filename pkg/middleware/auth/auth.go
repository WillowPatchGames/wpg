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
	GetToken() string
	SetUser(user *models.UserModel)
	GetObjectPointer() interface{}
}

func Require(handler Authed) parsel.Parseltongue {
	var ret = new(authMW)
	ret.next = handler
	ret.requireAuth = true

	if _, ok := handler.(hwaterr.ErrableHandler); ok {
		return hwaterr.Wrap(ret)
	} else {
		return ret
	}
}

func Allow(handler Authed) parsel.Parseltongue {
	var ret = new(authMW)
	ret.next = handler
	ret.requireAuth = false

	if _, ok := handler.(hwaterr.ErrableHandler); ok {
		return hwaterr.Wrap(ret)
	} else {
		return ret
	}
}

type authMW struct {
	http.Handler
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
		log.Println("Authed: Error beginning transaction:", err)
		return err
	}

	var token string = a.next.GetToken()

	var user *models.UserModel = new(models.UserModel)

	if token != "" {
		err = user.FromAPIToken(tx, token)
		if err != nil {
			user = nil
			if rollbackErr := tx.Rollback(); rollbackErr != nil {
				log.Print("Authed: Unable to rollback:", rollbackErr)
			}

			if a.requireAuth {
				return err
			}
		} else {
			err = tx.Commit()
			if err != nil {
				log.Println("Authed: Error committing transaction:", err)
				return err
			}
		}
	}

	a.next.SetUser(user)

	if next, ok := a.next.(http.Handler); ok && next != nil {
		next.ServeHTTP(w, r)
		return nil
	}

	if next, ok := a.next.(hwaterr.ErrableHandler); ok && next != nil {
		return next.ServeErrableHTTP(w, r)
	}

	panic("No next handler to call into; perhaps a type mismatch?")
}

func (a *authMW) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	_ = a.ServeErrableHTTP(w, r)
}
