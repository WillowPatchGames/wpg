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
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/api"
	api_errors "git.cipherboy.com/WillowPatchGames/wpg/pkg/errors"

	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/hwaterr"
)

// Request data. Because this is a sensitive endpoint that only listens on
// POST, only allow JSON request data; don't load it from headers or query
// parameters.
type authHandlerData struct {
	UserID   uint64 `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

// Response data.
type authHandlerResponse struct {
	UserID   uint64 `json:"id,omitempty"`
	Username string `json:"username,omitempty"`
	Email    string `json:"email,omitempty"`
	APIToken string `json:"token,omitempty"`
}

type AuthHandler struct {
	hwaterr.ErrableHandler
	utils.HTTPRequestHandler

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
	// We need at most one identifier for the user. This can either be
	// a UserID, a Username, or their email.

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

	// Gotta have a way of authenticating the user.
	if handle.req.Password == "" {
		return api_errors.ErrMissingPassword
	}

	// If we were given a username, we should ensure it is valid
	// for use.
	err := api.ValidateUsername(handle.req.Username)
	if err != nil {
		return err
	}

	// If we were given an email, we should ensure it is valid
	// for use.
	err = api.ValidateEmail(handle.req.Email)
	if err != nil {
		return err
	}

	return nil
}

// Respond to the POST request, returning an error on failure.
func (handle AuthHandler) ServeErrableHTTP(w http.ResponseWriter, r *http.Request) error {
	// Validate the request data before continuing.
	err := handle.verifyRequest()
	if err != nil {
		log.Println("Invalid request data:", handle.req, "-- err:", err)
		return hwaterr.WrapError(err, http.StatusBadRequest)
	}

	// In order to authenticate our user, we have to first get a database
	// transaction to load the user and their password in.
	tx, err := database.GetTransaction()
	if err != nil {
		log.Println("Getting transaction failed:", err)
		return err
	}

	// Load our user from the database, using the appropriate identifier.
	var user models.UserModel
	if handle.req.UserID != 0 {
		err = user.FromID(tx, handle.req.UserID)
	} else if handle.req.Username != "" {
		err = user.FromUsername(tx, handle.req.Username)
	} else if handle.req.Email != "" {
		err = user.FromEmail(tx, handle.req.Email)
	}

	if err != nil {
		log.Println("Getting user from database failed:", err)
		return hwaterr.WrapError(err, http.StatusNotFound)
	}

	// Validate the supplied password.
	var auth models.AuthModel
	err = auth.FromPassword(tx, user, handle.req.Password)
	if err != nil {
		log.Println("Unable to authenticate user by password:", err)
		return err
	}

	// Commit the transaction.
	err = tx.Commit()
	if err != nil {
		return err
	}

	// Populate response data and send it.
	handle.resp.UserID = user.ID
	handle.resp.Username = user.Username
	handle.resp.Email = user.Email
	handle.resp.APIToken = auth.APIToken

	utils.SendResponse(w, r, handle)
	return nil
}
