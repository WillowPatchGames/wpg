/*
 * Copyright (C) Alexander Scheel
 *
 * Licensed under the terms of the AGPLv3 license.
 */

package parsel

// This is the main entry point into the parsel parsing library. It includes
// the unexported parselmouth type that holds the main implementation.

import (
	"encoding/json"
	"io"
	"net/http"
	"reflect"
	"strings"

	"github.com/gorilla/mux"
	"github.com/gorilla/schema"
)

type parselmouth struct {
	http.Handler

	innerFactory func() Parseltongue
	config       ParselConfig

	schemaDecoder *schema.Decoder
}

type visitor interface {
	Visit(field reflect.Value, tagData string, debug bool) error
}

func isContentType(header string, value string) bool {
	return header == value || strings.HasPrefix(header, value+";")
}

func (p parselmouth) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if p.config.MaxBodyBytes > 0 {
		r.Body = http.MaxBytesReader(w, r.Body, p.config.MaxBodyBytes)
	}

	var inner = p.innerFactory()

	if !p.config.SkipHeader {
		err := p.fromHeader(w, r, inner)
		if err != nil {
			if p.config.DebugLogging {
				panic(err)
			}
			return
		}
	}

	if p.config.ParseMuxRoute {
		err := p.fromMuxRoute(w, r, inner)
		if err != nil {
			if p.config.DebugLogging {
				panic(err)
			}
			return
		}
	}

	if !p.config.SkipQuery {
		err := p.fromQuery(w, r, inner)
		if err != nil {
			if p.config.DebugLogging {
				panic(err)
			}
			return
		}
	}

	// All later requests are dependent upon content type.
	var contentType = r.Header.Get("Content-Type")
	var isJSONContent = isContentType(contentType, "application/json")
	var isFormContent = isContentType(contentType, "application/x-www-form-urlencoded")
	isFormContent = isFormContent || isContentType(contentType, "multipart/form-data")
	isFormContent = isFormContent || isContentType(contentType, "text/plain")

	if !p.config.SkipJSON && isJSONContent {
		for _, method := range p.config.JSONMethods {
			if r.Method != method {
				continue
			}

			err := p.fromJSON(w, r, inner)
			if err != nil {
				if p.config.DebugLogging {
					panic(err)
				}
				return
			}
		}
	}

	if !p.config.SkipSchema && isFormContent {
		for _, method := range p.config.SchemaMethods {
			if r.Method != method {
				continue
			}

			err := p.fromSchema(w, r, inner)
			if err != nil {
				if p.config.DebugLogging {
					panic(err)
				}
				return
			}
		}

	}

	inner.ServeHTTP(w, r)
}

func (p parselmouth) fromHeader(w http.ResponseWriter, r *http.Request, inner Parseltongue) error {
	var obj = inner.GetObjectPointer()

	var v HeaderVisitor
	v.header = r.Header

	if len(v.header) == 0 {
		return nil
	}

	return p.nestedReflect(obj, p.config.HeaderTag, v)
}

func (p parselmouth) fromQuery(w http.ResponseWriter, r *http.Request, inner Parseltongue) error {
	var obj = inner.GetObjectPointer()

	var v QueryVisitor
	v.query = r.URL.Query()

	if len(v.query) == 0 {
		return nil
	}

	return p.nestedReflect(obj, p.config.QueryTag, v)
}

func (p parselmouth) fromMuxRoute(w http.ResponseWriter, r *http.Request, inner Parseltongue) error {
	var obj = inner.GetObjectPointer()

	var v RouteVisitor
	v.vars = mux.Vars(r)

	if len(v.vars) == 0 {
		return nil
	}

	return p.nestedReflect(obj, p.config.RouteTag, v)
}

func (p parselmouth) fromJSON(w http.ResponseWriter, r *http.Request, inner Parseltongue) error {
	var obj = inner.GetObjectPointer()

	var decoder = json.NewDecoder(r.Body)
	defer r.Body.Close()

	err := decoder.Decode(obj)
	if err != nil {
		return err
	}

	if p.config.IgnoreMultipleJSONObjects {
		return nil
	}

	if !p.config.AllowMultipleJSONObjects {
		var again interface{}

		err = decoder.Decode(&again)
		if err != io.EOF {
			return io.ErrNoProgress
		}

		return nil
	}

	for err == nil {
		err = decoder.Decode(obj)
	}

	if err != io.EOF {
		return err
	}

	return nil
}

func (p parselmouth) fromSchema(w http.ResponseWriter, r *http.Request, inner Parseltongue) error {
	var obj = inner.GetObjectPointer()

	if p.schemaDecoder == nil {
		p.schemaDecoder = schema.NewDecoder()
	}

	p.schemaDecoder.IgnoreUnknownKeys(!p.config.ForbidUnknownSchemaKeys)
	p.schemaDecoder.SetAliasTag(p.config.SchemaTag)
	p.schemaDecoder.ZeroEmpty(p.config.ZeroEmptySchema)

	err := r.ParseForm()
	if err != nil {
		return err
	}

	return p.schemaDecoder.Decode(obj, r.PostForm)
}
