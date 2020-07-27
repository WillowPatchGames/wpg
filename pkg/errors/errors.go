package errors

import (
	"errors"
)

var ErrNoContentType = errors.New("unable to parse malformed or missing Content-Type header on request")
var ErrUnknownContentType = errors.New("unknown or unsupported Content-Type header on request")

var ErrMultipleJSONObjects = errors.New("got multiple JSON objects when we only expected one")

var ErrMissingUsernameOrEmail = errors.New("missing username or email to describe new user")
var ErrMissingPassword = errors.New("missing password")
