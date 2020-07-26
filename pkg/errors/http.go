package errors

import (
	"encoding/json"
	"log"
	"net/http"
)

var stringToStatusCode = map[string]int {
	NoContentType.Error(): http.StatusBadRequest,
}

type ErrorResult struct {
    Type    string `json:"type"`
    Message string `json:"message"`
    Fatal   bool   `json:"fatal"`
}

func WriteError(w http.ResponseWriter, value error, fatal bool) {
    var ret ErrorResult
    ret.Type = "error"
    ret.Message = value.Error()
    ret.Fatal = fatal

    var data []byte

    data, err := json.Marshal(ret)
    if err != nil {
        log.Println("Unable to marshal error struct: " + err.Error() + " -- value: " + value.Error())
    }

    w.Header().Set("Content-Type", "application/json")

	code, present := stringToStatusCode[ret.Message]
	if present {
		w.WriteHeader(code)
	} else {
		w.WriteHeader(http.StatusBadRequest)
	}

	if data != nil {
	    w.Write(data)
		w.Write([]byte { byte('\n') })
	}
}
