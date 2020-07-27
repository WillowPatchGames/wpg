/*
 * Copyright (C) Alexander Scheel
 *
 * Licensed under the terms of the AGPLv3.
 */

package auth

import (
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
	http.Handler
	utils.HTTPRequestHandler

	req  authHandlerData
	resp authHandlerResponse
}

func (handle AuthHandler) GetRequest() interface{} {
  return &handle.req
}

func (handle AuthHandler) GetResponse() interface{} {
  return handle.resp
}

func (handle AuthHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	err := utils.ParseRequest(w, r, &handle)
	if err != nil {
		api_errors.WriteError(w, err, true)
		return
	}

	utils.SendResponse(w, r, handle)
}
