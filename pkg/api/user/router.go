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

	var planQueryFactory = func() parsel.Parseltongue {
		inner := new(PlansHandler)
		return auth.Require(inner)
	}

	var getTOTPFactory = func() parsel.Parseltongue {
		inner := new(ListTOTPHandler)
		return auth.Require(inner)
	}

	var enrollTOTPFactory = func() parsel.Parseltongue {
		inner := new(NewTOTPHandler)
		return auth.Require(inner)
	}

	var showTOTPFactory = func() parsel.Parseltongue {
		inner := new(ViewTOTPHandler)
		return auth.Require(inner)
	}

	var removeTOTPFactory = func() parsel.Parseltongue {
		inner := new(DeleteTOTPHandler)
		return auth.Require(inner)
	}

	var validateTOTPFactory = func() parsel.Parseltongue {
		inner := new(ValidateTOTPHandler)
		return auth.Require(inner)
	}

	var searchGamesFactory = func() parsel.Parseltongue {
		inner := new(SearchGamesHandler)
		return auth.Require(inner)
	}

	var searchRoomsFactory = func() parsel.Parseltongue {
		inner := new(SearchRoomsHandler)
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

	router.Handle("/api/v1/user/{UserID:[0-9]+}/plans", parsel.Wrap(planQueryFactory, config)).Methods("GET")

	router.Handle("/api/v1/user/{UserID:[0-9]+}/totp", parsel.Wrap(getTOTPFactory, config)).Methods("GET")
	router.Handle("/api/v1/user/{UserID:[0-9]+}/totp", parsel.Wrap(enrollTOTPFactory, config)).Methods("PUT")
	router.Handle("/api/v1/user/{UserID:[0-9]+}/totp", parsel.Wrap(removeTOTPFactory, config)).Methods("DELETE")
	router.Handle("/api/v1/user/{UserID:[0-9]+}/totp/{Device:[a-zA-Z0-9]+}", parsel.Wrap(removeTOTPFactory, config)).Methods("DELETE")

	router.Handle("/api/v1/user/{UserID:[0-9]+}/totp/image", parsel.Wrap(showTOTPFactory, config)).Methods("GET")
	router.Handle("/api/v1/user/{UserID:[0-9]+}/totp/{Device:[a-zA-Z0-9]+}/image", parsel.Wrap(showTOTPFactory, config)).Methods("GET")

	router.Handle("/api/v1/user/{UserID:[0-9]+}/totp/validate", parsel.Wrap(validateTOTPFactory, config)).Methods("PUT")
	router.Handle("/api/v1/user/{UserID:[0-9]+}/totp/{Device:[a-zA-Z0-9]+}/validate", parsel.Wrap(validateTOTPFactory, config)).Methods("PUT")

	router.Handle("/api/v1/user/{UserID:[0-9]+}/games", parsel.Wrap(searchGamesFactory, config)).Methods("GET")
	router.Handle("/api/v1/user/{UserID:[0-9]+}/games/{Lifecycle:[a-zA-Z0-9]+}", parsel.Wrap(searchGamesFactory, config)).Methods("GET")

	router.Handle("/api/v1/user/{UserID:[0-9]+}/rooms", parsel.Wrap(searchRoomsFactory, config)).Methods("GET")
	router.Handle("/api/v1/user/{UserID:[0-9]+}/rooms/{Lifecycle:[a-zA-Z0-9]+}", parsel.Wrap(searchRoomsFactory, config)).Methods("GET")

	router.Handle("/api/v1/user/{UserID:[0-9]+}/rooms/{RoomID:[0-9]+}/games", parsel.Wrap(searchGamesFactory, config)).Methods("GET")
	router.Handle("/api/v1/user/{UserID:[0-9]+}/rooms/{RoomID:[0-9]+}/games/{Lifecycle:[a-zA-Z0-9]+}", parsel.Wrap(searchGamesFactory, config)).Methods("GET")

	router.Handle("/api/v1/user", parsel.Wrap(queryFactory, config)).Methods("GET")
	router.Handle("/api/v1/user/plans", parsel.Wrap(planQueryFactory, config)).Methods("GET")

	router.Handle("/api/v1/users", parsel.Wrap(registerFactory, config)).Methods("POST")
}
