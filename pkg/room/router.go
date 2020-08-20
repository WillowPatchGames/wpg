package room

import (
	"github.com/gorilla/mux"

	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/auth"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/parsel"
)

// BuildRouter registers routes
func BuildRouter(router *mux.Router, debug bool) {
	var config parsel.ParselConfig
	config.DebugLogging = debug
	config.ParseMuxRoute = true
	config.SchemaTag = "json"

	var createFactory = func() parsel.Parseltongue {
		inner := new(CreateHandler)
		return auth.Require(inner)
	}

	var queryFactory = func() parsel.Parseltongue {
		inner := new(QueryHandler)
		return auth.Require(inner)
	}

	router.Handle("/room/find", parsel.Wrap(queryFactory, config)).Methods("GET")
	router.Handle("/room/{RoomID:[0-9]+}", parsel.Wrap(queryFactory, config)).Methods("GET")
	router.Handle("/room", parsel.Wrap(queryFactory, config)).Methods("GET")
	router.Handle("/rooms", parsel.Wrap(createFactory, config)).Methods("POST")
}
