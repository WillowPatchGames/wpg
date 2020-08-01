package game

import (
	"fmt"

	"github.com/gorilla/mux"

	"git.cipherboy.com/WordCorp/api/pkg/middleware/parsel"
)

// BuildRouter registers routes
func BuildRouter(router *mux.Router, debug bool) {
	var config parsel.ParselConfig
	config.DebugLogging = debug
	config.ParseMuxRoute = true
	config.SchemaTag = "json"

	var createFactory = func() parsel.Parseltongue {
		return new(CreateHandler)
	}
	var queryFactory = func() parsel.Parseltongue {
		return new(QueryHandler)
	}

	router.Handle("/game/{GameID:[0-9]+}", parsel.Wrap(queryFactory, config)).Methods("GET")
	router.Handle("/game", parsel.Wrap(queryFactory, config)).Methods("GET")
	router.Handle("/games", parsel.Wrap(createFactory, config)).Methods("POST")

	var sake SocketHandler
	sake.hubby = NewHub()
	fmt.Println(sake.hubby.game.letters)
	go sake.hubby.Run()

	router.Handle("/game/ws", sake).Methods("GET")
}
