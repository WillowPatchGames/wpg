/*
 * Copyright (C) Alexander Scheel
 *
 * Licensed under the terms of the AGPLv3.
 */

package auth

import (
	"github.com/gorilla/mux"

	"git.cipherboy.com/WordCorp/api/pkg/middleware/parsel"
)

func BuildRouter(router *mux.Router) {
	var config parsel.ParselConfig
	config.DebugLogging = true
	config.ParseMuxRoute = true

	var authFactory = func() parsel.Parseltongue {
		return new(AuthHandler)
	}

	router.Handle("/auth", parsel.Wrap(authFactory, config)).Methods("POST")
}
