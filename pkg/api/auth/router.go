/*
 * Copyright (C) Alexander Scheel
 *
 * Licensed under the terms of the AGPLv3.
 */

package auth

import (
	"github.com/gorilla/mux"

	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/hwaterr"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/parsel"
)

// Populate our auth path (/api/v1/auth) with relevant handlers.
//
// XXX: Add DELETE method to allow expiration of auth information.
func BuildRouter(router *mux.Router, debug bool) {
	var config parsel.ParselConfig
	config.DebugLogging = debug
	config.ParseMuxRoute = false
	config.SchemaTag = "json"

	// The authentication handler uses Parsel for loading authentication
	// request data and hwaterr for returning errors. It only responds to
	// POST requests.
	var authFactory = func() parsel.Parseltongue {
		return hwaterr.Wrap(new(AuthHandler))
	}

	router.Handle("/api/v1/auth", parsel.Wrap(authFactory, config)).Methods("POST")
}
