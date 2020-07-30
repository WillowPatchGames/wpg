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

func BuildRouter(router *mux.Router, debug bool) {
	var config parsel.ParselConfig
	config.DebugLogging = debug
	config.ParseMuxRoute = false
	config.SchemaTag = "json"

	var authFactory = func() parsel.Parseltongue {
		return new(AuthHandler)
	}

	router.Handle("/auth", parsel.Wrap(authFactory, config)).Methods("POST")
}
