package game

import (
	"fmt"

	"github.com/gorilla/mux"
)

// BuildRouter registers routes
func BuildRouter(router *mux.Router, debug bool) {
	var sake SocketHandler
	sake.hubby = NewHub()
	fmt.Println(sake.hubby.game.letters)
	go sake.hubby.Run()

	router.Handle("/game/ws", sake).Methods("GET")
}
