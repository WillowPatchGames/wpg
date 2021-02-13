package game

import (
	"github.com/gorilla/mux"

	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/auth"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/hwaterr"
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

	var deleteFactory = func() parsel.Parseltongue {
		inner := new(DeleteHandler)
		return auth.Require(inner)
	}

	var configHandler = new(ConfigHandler)
	configHandler.Serialize()

	router.Handle("/api/v1/game", parsel.Wrap(queryFactory, config)).Methods("GET")
	router.Handle("/api/v1/game", parsel.Wrap(deleteFactory, config)).Methods("DELETE")
	router.Handle("/api/v1/game/find", parsel.Wrap(queryFactory, config)).Methods("GET")
	router.Handle("/api/v1/game/{GameID:[0-9]+}", parsel.Wrap(queryFactory, config)).Methods("GET")
	router.Handle("/api/v1/game/{GameID:[0-9]+}", parsel.Wrap(deleteFactory, config)).Methods("DELETE")

	router.Handle("/api/v1/games/config", hwaterr.Wrap(configHandler)).Methods("GET")
	router.Handle("/api/v1/games", parsel.Wrap(createFactory, config)).Methods("POST")

	gamehub := NewHub()
	go gamehub.Run()

	var socketFactory = func() parsel.Parseltongue {
		ret := new(SocketHandler)
		ret.Hub = gamehub
		return auth.Require(ret)
	}

	router.Handle("/api/v1/game/{GameID:[0-9]+}/ws", parsel.Wrap(socketFactory, config)).Methods("GET")
}
