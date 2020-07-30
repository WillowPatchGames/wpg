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

	router.Handle("/user/{UserID:[0-9]+}", parsel.Wrap(new(QueryHandler), config)).Methods("GET")
	router.Handle("/user", parsel.Wrap(new(QueryHandler), config)).Methods("GET")
	router.Handle("/users", parsel.Wrap(new(RegisterHandler), config)).Methods("POST")
}
