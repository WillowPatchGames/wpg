package errors

import (
	"errors"
)

var ErrNoContentType = errors.New("unable to parse malformed or missing Content-Type header on request")
var ErrUnknownContentType = errors.New("unknown or unsupported Content-Type header on request")

var ErrMultipleJSONObjects = errors.New("got multiple JSON objects when we only expected one")

var ErrMissingUsernameOrEmail = errors.New("missing username or email to describe new user")
var ErrMissingDisplay = errors.New("missing display name on new user")
var ErrMissingPassword = errors.New("missing password")

var ErrMissingRequest = errors.New("missing request paremeters")
var ErrTooManySpecifiers = errors.New("too many specifiers present on the request")
var ErrBadValue = errors.New("bad value for parameter")

var ErrAccessDenied = errors.New("access denied to perform the specified action")
