package user

import (
    "net/http"
)

type RegisterHandler struct {
    http.Handler
}

func (handle RegisterHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    w.Write([]byte{byte('\n')})
}
