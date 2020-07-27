package utils

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"

	api_errors "git.cipherboy.com/WordCorp/api/pkg/errors"
)

type HTTPRequestHandler interface {
	GetRequest() interface{}
	GetResponse() interface{}
	GetRequestType() string
	SetRequestType(requestType string)
}

var allowedRequestContentTypes = []string{
	"application/json",
	"application/x-www-form-urlencoded",
	"multipart/form-data",
}

var maxRequestSize int64 = 50 * 1024

func validContentType(contentType string) bool {
	for _, value := range allowedRequestContentTypes {
		if value == contentType {
			return true
		}
	}

	return false
}

func ParseRequest(w http.ResponseWriter, r *http.Request, handle HTTPRequestHandler) error {
	var err error

	var contentTypeValue = r.Header.Get("Content-Type")
	if contentTypeValue == "" {
		return api_errors.ErrNoContentType
	}

	var contentTypeSplit []string = strings.SplitN(contentTypeValue, " ", 2)
	if len(contentTypeSplit) == 0 {
		return api_errors.ErrNoContentType
	}

	handle.SetRequestType(contentTypeSplit[0])
	if !validContentType(handle.GetRequestType()) {
		return api_errors.ErrUnknownContentType
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxRequestSize)
	if handle.GetRequestType() == "application/json" {
		var decoder = json.NewDecoder(r.Body)

		err = decoder.Decode(handle.GetRequest())
		if err != nil {
			return err
		}

		var obj interface{}

		err = decoder.Decode(&obj)
		if err != io.EOF {
			return api_errors.ErrMultipleJSONObjects
		}
	} else {
		return api_errors.ErrUnknownContentType
	}

	return nil
}

func SendResponse(w http.ResponseWriter, r *http.Request, obj interface{}) {
	resp_data, err := json.Marshal(obj)
	if err != nil {
		api_errors.WriteError(w, err, true)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(resp_data)
	w.Write([]byte{byte('\n')})
}
