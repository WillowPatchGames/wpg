package hwaterr

import (
	"net/http"

	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/parsel"
)

type apiResult struct {
	Type       string `json:"type"`
	Message    string `json:"message"`
	StatusCode int    `json:"status_code"`
}

type errableHandler struct {
	http.Handler
	parsel.Parseltongue

	next ErrableHandler
}

func (eh errableHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	var err error = eh.next.ServeErrableHTTP(w, r)
	if err != nil {
		WriteError(w, r, err)
	}
}

func (eh *errableHandler) GetObjectPointer() interface{} {
	return eh.next.GetObjectPointer()
}

type httpError struct {
	message string
	code    int
}

func (hE httpError) Error() string {
	return hE.message
}

func (hE httpError) StatusCode() int {
	return hE.code
}
