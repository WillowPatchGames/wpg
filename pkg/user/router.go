/*
 * Copyright (C) Alexander Scheel
 *
 * Licensed under the terms of the AGPLv3.
 */

package user

import (
	"github.com/gorilla/mux"
)

func BuildRouter(router *mux.Router) {
    router.Handle("/{eid:[0-9]+}", new(QueryHandler)).Methods("GET")
	router.Handle("/", new(RegisterHandler)).Methods("POST")
}
