/*
 * Copyright (C) Alexander Scheel
 *
 * Licensed under the terms of the AGPLv3 license.
 */

package hwaterr

import (
	"encoding/json"
	"log"
	"net/http"

	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/parsel"
)

type HTTPError interface {
	error
	StatusCode() int
}

func WrapError(msg error, status int) HTTPError {
	return httpError{msg.Error(), status}
}

type ErrableHandler interface {
	GetObjectPointer() interface{}
	ServeErrableHTTP(w http.ResponseWriter, r *http.Request) error
}

func EncodeError(ret error) (int, []byte) {
	var code int = http.StatusInternalServerError
	casted, ok := ret.(HTTPError)
	if ok {
		code = casted.StatusCode()
	}

	var obj apiResult
	obj.Type = "error"
	obj.Message = ret.Error()
	obj.StatusCode = code

	var data []byte

	data, err := json.Marshal(obj)
	if err != nil {
		panic("Unable to marshal error struct: " + err.Error() + " -- error value: " + ret.Error())
	}

	data = append(data, '\n')

	return code, data
}

func WriteError(w http.ResponseWriter, r *http.Request, ret error) {
	code, data := EncodeError(ret)
	log.Println("Got:", code, " -> ", string(data))

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)

	var index = 0
	for index < len(data) {
		offset, err := w.Write(data[index:])
		index += offset

		if err != nil {
			panic("Unable to write complete error object: " + err.Error())
		}
	}
}

func Wrap(next ErrableHandler) parsel.Parseltongue {
	var obj errableHandler
	obj.next = next
	return &obj
}
