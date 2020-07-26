/*
 * Copyright (C) Alexander Scheel
 *
 * Licensed under the terms of the AGPLv3.
 */

package auth

import (
	"encoding/json"
	"net/http"

	"git.cipherboy.com/WordCorp/api/internal/utils"
	api_errors "git.cipherboy.com/WordCorp/api/pkg/errors"
)

type authHandlerData struct {
	internalID uint64 `json:"id"`
	UserID     uint64 `json:"eid"`
	Username   string `json:"username"`
	Email      string `json:"email"`
	Password   string `json:"password"`
}

type authHandlerResponse struct {
	UserID   uint64 `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	ApiToken string `json:"token"`
}

type AuthHandler struct {
	req  authHandlerData
	resp authHandlerResponse
}

func (handle AuthHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	err := utils.ParseRequest(w, r, &handle)
	if err != nil {
		api_errors.WriteError(w, err, true)
		return
	}

	var resp_data []byte
	resp_data, err = json.Marshal(handle.resp)
	if err != nil {
		api_errors.WriteError(w, err, true)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(resp_data)
	w.Write([]byte{byte('\n')})
}
