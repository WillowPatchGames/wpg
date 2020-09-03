/*
 * Copyright (C) Alexander Scheel
 *
 * Licensed under the terms of the AGPLv3.
 */

package auth

import (
	"log"
	"net/http"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
	"git.cipherboy.com/WillowPatchGames/wpg/internal/models"
	"git.cipherboy.com/WillowPatchGames/wpg/internal/utils"
	api_errors "git.cipherboy.com/WillowPatchGames/wpg/pkg/errors"

	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/parsel"
)

type authHandlerData struct {
	UserID   uint64 `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type authHandlerResponse struct {
	UserID   uint64 `json:"id,omitempty"`
	Username string `json:"username,omitempty"`
	Email    string `json:"email,omitempty"`
	APIToken string `json:"token,omitempty"`
}

type AuthHandler struct {
	http.Handler
	utils.HTTPRequestHandler
	parsel.Parseltongue

	req  authHandlerData
	resp authHandlerResponse
}

func (handle AuthHandler) GetResponse() interface{} {
	return handle.resp
}

func (handle *AuthHandler) GetObjectPointer() interface{} {
	return &handle.req
}

func (handle AuthHandler) verifyRequest() error {
	var present int = 0
	if handle.req.UserID != 0 {
		present++
	}
	if handle.req.Username != "" {
		present++
	}
	if handle.req.Email != "" {
		present++
	}

	if present == 0 {
		return api_errors.ErrMissingRequest
	}

	if present > 1 {
		return api_errors.ErrTooManySpecifiers
	}

	if handle.req.Password == "" {
		return api_errors.ErrMissingPassword
	}

	return nil
}

func (handle AuthHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	err := handle.verifyRequest()
	if err != nil {
		log.Println("Here")
		api_errors.WriteError(w, err, true)
		return
	}

	tx, err := database.GetTransaction()
	if err != nil {
		log.Println("Transaction?")
		api_errors.WriteError(w, err, true)
		return
	}

	var user models.UserModel
	if handle.req.UserID != 0 {
		err = user.FromID(tx, handle.req.UserID)
	} else if handle.req.Username != "" {
		err = user.FromUsername(tx, handle.req.Username)
	} else if handle.req.Email != "" {
		err = user.FromEmail(tx, handle.req.Email)
	}

	if err != nil {
		api_errors.WriteError(w, err, true)
		return
	}

	var auth models.AuthModel
	err = auth.FromPassword(tx, user, handle.req.Password)
	if err != nil {
		api_errors.WriteError(w, err, true)
		return
	}

	err = tx.Commit()
	if err != nil {
		api_errors.WriteError(w, err, true)
		return
	}

	handle.resp.UserID = user.ID
	handle.resp.Username = user.Username
	handle.resp.Email = user.Email
	handle.resp.APIToken = auth.APIToken

	utils.SendResponse(w, r, handle)
}
