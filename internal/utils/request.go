package utils

import (
	"encoding/json"
	"net/http"

	api_errors "git.cipherboy.com/WillowPatchGames/wpg/pkg/errors"
)

type HTTPRequestHandler interface {
	GetResponse() interface{}
}

func SendResponse(w http.ResponseWriter, r *http.Request, obj HTTPRequestHandler) {
	resp_data, err := json.Marshal(obj.GetResponse())
	if err != nil {
		api_errors.WriteError(w, err, true)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	if _, err = w.Write(resp_data); err != nil {
		return
	}

	if _, err = w.Write([]byte{byte('\n')}); err != nil {
		return
	}
}
