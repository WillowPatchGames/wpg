/*
 * Copyright (C) Alexander Scheel
 *
 * Licensed under the terms of the AGPLv3.
 */

package auth

import (
	"log"
	"net/http"

	"gorm.io/gorm"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
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

	var user database.User
	var auth database.Auth

	if err := database.InTransaction(func(tx *gorm.DB) error {
		var err error = nil
		if handle.req.UserID != 0 {
			err = tx.First(&user, handle.req.UserID).Error
		} else if handle.req.Username != "" {
			err = tx.First(&user, "username = ?", handle.req.Username).Error
		} else if handle.req.Email != "" {
			err = tx.First(&user, "email = ?", handle.req.Email).Error
		}

		if err != nil {
			return err
		}

		return user.FromPassword(tx, &auth, handle.req.Password)
	}); err != nil {
		return err
	}

	// Populate response data and send it.
	handle.resp.UserID = user.ID
	if user.Username.Valid {
		handle.resp.Username = user.Username.String
	}

	if user.Email.Valid {
		handle.resp.Email = user.Email.String
	}

	handle.resp.APIToken = auth.Key

	utils.SendResponse(w, r, handle)
	return nil
}
