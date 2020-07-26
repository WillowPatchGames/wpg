package errors

import (
	"errors"
)

var NoContentType = errors.New("Unable to parse malformed or missing Content-Type header on request.")
var UnknownContentType = errors.New("Unknown or unsupported Content-Type header on request.")

var MultipleJSONObjects = errors.New("Got multiple JSON objects when we only expected one.")
