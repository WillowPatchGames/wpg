/*
 * Copyright (C) Alexander Scheel
 *
 * Licensed under the terms of the AGPLv3.
 */

package user

import (
	"github.com/gorilla/mux"

	"git.cipherboy.com/WordCorp/api/pkg/middleware/parsel"
)

func BuildRouter(router *mux.Router) {
	var config parsel.ParselConfig
	config.DebugLogging = true
	config.ParseMuxRoute = true

	var queryFactory = func() parsel.Parseltongue {
		return new(QueryHandler)
	}

	var registerFactory = func() parsel.Parseltongue {
		return new(RegisterHandler)
	}

	router.Handle("/user/{UserID:[0-9]+}", parsel.Wrap(queryFactory, config)).Methods("GET")
	router.Handle("/user", parsel.Wrap(queryFactory, config)).Methods("GET")

	router.Handle("/users", parsel.Wrap(registerFactory, config)).Methods("POST")
}
