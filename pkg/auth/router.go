/*
 * Copyright (C) Alexander Scheel
 *
 * Licensed under the terms of the AGPLv3.
 */

package auth

import (
	"github.com/gorilla/mux"
)

func BuildRouter(router *mux.Router) {
	router.Handle("/", new(AuthHandler)).Methods("POST")
}
