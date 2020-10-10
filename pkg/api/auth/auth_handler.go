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
	UserID    uint64 `json:"id"`
	Username  string `json:"username"`
	Email     string `json:"email"`
	Password  string `json:"password"`
	Token2FA  string `json:"token"`
	Temporary string `json:"temporary"`
}

// Response data.
type authHandlerResponse struct {
	UserID   uint64 `json:"id,omitempty"`
	Username string `json:"username,omitempty"`
	Email    string `json:"email,omitempty"`
	APIToken string `json:"token,omitempty"`
	Needs2FA bool   `json:"need2fa"`
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

	// Gotta have a way of authenticating the user when this is pre-auth.
	if handle.req.Password == "" && handle.req.Temporary == "" {
		return api_errors.ErrMissingPassword
	}

	// Gotta have a way of validating 2FA when this is post-auth.
	if handle.req.Token2FA == "" && handle.req.Temporary != "" {
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

func (handle AuthHandler) DoPreAuth(tx *gorm.DB, user *database.User, auth *database.Auth) error {
	var err error = nil
	if handle.req.UserID != 0 {
		err = tx.First(user, handle.req.UserID).Error
	} else if handle.req.Username != "" {
		err = tx.First(user, "username = ?", handle.req.Username).Error
	} else if handle.req.Email != "" {
		err = tx.First(user, "email = ?", handle.req.Email).Error
	}

	if err != nil {
		return err
	}

	return user.FromPassword(tx, auth, handle.req.Password)
}

func (handle AuthHandler) DoPostAuth(tx *gorm.DB, user *database.User, auth *database.Auth) error {
	var err error = nil
	if handle.req.UserID != 0 {
		err = tx.First(user, handle.req.UserID).Error
	} else if handle.req.Username != "" {
		err = tx.First(user, "username = ?", handle.req.Username).Error
	} else if handle.req.Email != "" {
		err = tx.First(user, "email = ?", handle.req.Email).Error
	}

	if err != nil {
		return err
	}

	return user.FinishAuth(tx, auth, handle.req.Temporary, handle.req.Token2FA)
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
		if handle.req.Temporary == "" {
			return handle.DoPreAuth(tx, &user, &auth)
		}

		return handle.DoPostAuth(tx, &user, &auth)
	}); err != nil {
		return err
	}

	// Populate response data and send it.
	handle.resp.UserID = user.ID
	handle.resp.APIToken = auth.Key
	handle.resp.Needs2FA = auth.Category != "api-token"

	if !handle.resp.Needs2FA {
		database.SetStringFromSQL(&handle.resp.Username, user.Username)
		database.SetStringFromSQL(&handle.resp.Email, user.Email)
	}

	utils.SendResponse(w, r, handle)
	return nil
}
