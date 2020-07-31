package game

import (
	"fmt"
	"net/http"

	"github.com/gorilla/mux"
)

// SocketHandler is a handler for game connections
type SocketHandler struct {
	http.Handler

	hubby *Hub
}

func (handle SocketHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ServeWs(handle.hubby, w, r)
}

// BuildRouter registers routes
func BuildRouter(router *mux.Router, debug bool) {
	var sake SocketHandler
	sake.hubby = NewHub()
	fmt.Println(sake.hubby.game.letters)
	go sake.hubby.Run()

	router.Handle("/game/ws", sake).Methods("GET")
}
