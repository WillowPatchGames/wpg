/*
 * Copyright (C) Alexander Scheel
 *
 * Licensed under the terms of the AGPLv3.
 */

package auth

import (
	"encoding/json"
	"log"
	"net/http"
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
	err := json.NewDecoder(r.Body).Decode(&handle.req)
	if err != nil {
		log.Println(err)
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	json, err := json.Marshal(handle.resp)
	if err != nil {
		log.Println(err)
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(json)
	w.Write([]byte { byte('\n') })
}
