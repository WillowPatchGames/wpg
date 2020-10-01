package auth

import (
	"log"
	"net/http"

	"gorm.io/gorm"

	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/hwaterr"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/parsel"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
)

type Authed interface {
	GetToken() string
	SetUser(user *database.User)
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
	var token string = a.next.GetToken()

	var user *database.User = nil

	if token != "" {
		if err := database.InTransaction(func(tx *gorm.DB) error {
			var auth database.Auth
			if err := tx.Preload("User").Last(&auth, "category = ? AND key = ?", "api_token", token).Error; err != nil {
				log.Println("Unable to find user with token", token)
				return err
			}

			user = &auth.User
			log.Println("Got user:", user)
			return nil
		}); err != nil {
			return err
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
