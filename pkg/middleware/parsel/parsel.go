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
// - query, to access data in query strings,
// - schema, to access form data per gorilla/schema rules,
// - json, to access JSON data per encoding/json rules,
// - &c.
//
// parsel also includes a few configuration options which make it nice to
// use. These get propagated to helper libraries (gorilla/schema,
// encoding/json, &c) as necessary.

import (
	"net/http"
)

type Parseltongue interface {
	http.Handler

	GetObjectPointer() interface{}
}

type ParselConfig struct {
	AllowUnmatchedFields   bool
	DisallowUnmatchedQuery bool
	DebugLogging           bool
	SkipQuery              bool
	QueryTag               string
	ParseMuxRoute          bool
	RouteTag               string
}

func Wrap(inner Parseltongue, config ParselConfig) http.Handler {
	var ret = new(parselmouth)
	ret.inner = inner
	ret.config = config

	if ret.config.QueryTag == "" {
		ret.config.QueryTag = "query"
	}

	if ret.config.RouteTag == "" {
		ret.config.RouteTag = "route"
	}

	return ret
}
