package utils

import (
    "encoding/json"
    "io"
    "net/http"
    "strings"

    api_errors "git.cipherboy.com/WordCorp/api/pkg/errors"
)

var allowedRequestContentTypes = []string {
    "application/json",
    "application/x-www-form-urlencoded",
    "multipart/form-data",
}

var maxRequestSize int64 = 50 * 1024

func validContentType(contentType string) bool {
    for _, value := range allowedRequestContentTypes {
        if value == contentType {
            return true
        }
    }

    return false
}

func ParseRequest(w http.ResponseWriter, r *http.Request, obj interface{}) error {
    var err error

    var contentTypeValue = r.Header.Get("Content-Type")
    if contentTypeValue == "" {
        return api_errors.NoContentType
    }

    var contentTypeSplit []string = strings.SplitN(contentTypeValue, " ", 2)
    if len(contentTypeSplit) == 0 {
        return api_errors.NoContentType
    }

    var contentType = contentTypeSplit[0]
    if !validContentType(contentType) {
        return api_errors.UnknownContentType
    }

    r.Body = http.MaxBytesReader(w, r.Body, maxRequestSize)
    if contentType == "application/json" {
        var decoder = json.NewDecoder(r.Body)

        err = decoder.Decode(obj)
        if err != nil {
            return err
        }

        err = decoder.Decode(obj)
        if err != io.EOF {
            return api_errors.MultipleJSONObjects
        }
    } else {
        return api_errors.UnknownContentType
    }

    return nil
}
