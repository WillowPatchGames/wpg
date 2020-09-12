/*
 * Copyright (C) Alexander Scheel
 *
 * Licensed under the terms of the AGPLv3.
 */

package user

import (
	"github.com/gorilla/mux"

	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/auth"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/hwaterr"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/parsel"
)

func BuildRouter(router *mux.Router, debug bool) {
	var config parsel.ParselConfig
	config.DebugLogging = debug
	config.ParseMuxRoute = true
	config.SchemaTag = "json"

	var upgradeFactory = func() parsel.Parseltongue {
		inner := new(UpgradeHandler)
		return auth.Require(inner)
	}

	var queryFactory = func() parsel.Parseltongue {
		inner := new(QueryHandler)
		return auth.Allow(inner)
	}

	var updateFactory = func() parsel.Parseltongue {
		inner := new(UpdateHandler)
		return auth.Require(inner)
	}

	var registerFactory = func() parsel.Parseltongue {
		return hwaterr.Wrap(new(RegisterHandler))
	}

	router.Handle("/api/v1/user/{UserID:[0-9]+}/upgrade", parsel.Wrap(upgradeFactory, config)).Methods("PUT")

	router.Handle("/api/v1/user/{UserID:[0-9]+}", parsel.Wrap(queryFactory, config)).Methods("GET")
	router.Handle("/api/v1/user/{UserID:[0-9]+}", parsel.Wrap(updateFactory, config)).Methods("PATCH")

	router.Handle("/api/v1/user", parsel.Wrap(queryFactory, config)).Methods("GET")

	router.Handle("/api/v1/users", parsel.Wrap(registerFactory, config)).Methods("POST")
}
