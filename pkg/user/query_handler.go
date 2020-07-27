package user

import (
	"net/http"
)

type QueryHandler struct {
	http.Handler
}

func (handle QueryHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte{byte('\n')})
}
