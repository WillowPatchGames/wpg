/*
 * Copyright (C) Alexander Scheel
 *
 * Licensed under the terms of the AGPLv3 license.
 */

package parsel

// parsel is a library for parsing the various sources of request data
// (query strings, form data, JSON and XML bodies) and merging it into a
// single unified request data structure. Because this is a middleware,
// your http.Handler gets called with the data it expects, in the format
// it wants.
//
// Unfortunately, Go doesn't allow dynamically rewriting struct fields' tags
// at runtime. This makes it impossible to use a single, unified field tag
// across all encodings (query string, form data, JSON, XML, ...). Instead,
// per-source tags must always be used:
// - schema, to access form data per gorilla/schema rules,
// - json, to access JSON data per encoding/json rules,
// - configurable values for tags Parsel parses.
// - &c.
//
// parsel also includes a few configuration options which make it nice to
// use. These get propagated to helper libraries (gorilla/schema,
// encoding/json, &c) as necessary.
//
// Parsing goes from header -> mux.Route -> query strings -> request body.

import (
	"net/http"
)

type Parseltongue interface {
	http.Handler

	GetObjectPointer() interface{}
}

type ParselConfig struct {
	DebugLogging bool
	MaxBodyBytes int64

	SkipHeader bool
	HeaderTag  string

	SkipQuery bool
	QueryTag  string

	ParseMuxRoute bool
	RouteTag      string

	SkipJSON                  bool
	AllowMultipleJSONObjects  bool
	IgnoreMultipleJSONObjects bool
	JSONMethods               []string

	SkipSchema              bool
	SchemaMethods           []string
	ForbidUnknownSchemaKeys bool
	ZeroEmptySchema         bool
	SchemaTag               string
}

func Wrap(factory func() Parseltongue, config ParselConfig) http.Handler {
	var ret = new(parselmouth)
	ret.innerFactory = factory
	ret.config = config

	if ret.config.HeaderTag == "" {
		ret.config.HeaderTag = "header"
	}

	if ret.config.QueryTag == "" {
		ret.config.QueryTag = "query"
	}

	if ret.config.RouteTag == "" {
		ret.config.RouteTag = "route"
	}

	if ret.config.SchemaTag == "" {
		ret.config.SchemaTag = "schema"
	}

	var methods []string = []string{"POST", "PUT", "PATCH", "DELETE"}
	if ret.config.JSONMethods == nil {
		ret.config.JSONMethods = methods
	}
	if ret.config.SchemaMethods == nil {
		ret.config.SchemaMethods = methods
	}

	if ret.config.MaxBodyBytes == 0 {
		ret.config.MaxBodyBytes = 10 * 1024 * 1024
	}

	return ret
}
