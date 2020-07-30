/*
 * Copyright (C) Alexander Scheel
 *
 * Licensed under the terms of the AGPLv3 license.
 */

package parsel

// This is the main entry point into the parsel parsing library. It includes
// the unexported parselmouth type that holds the main implementation.

import (
	"log"
	"net/http"
	"reflect"
)

type parselmouth struct {
	http.Handler

	inner  Parseltongue
	config ParselConfig
}

type visitor interface {
	Visit(field reflect.Value, tag_data string, debug bool) error
}

func (p parselmouth) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	log.Println("Got request: ")

	if !p.config.SkipQuery {
		err := p.fromQuery(w, r)
		if err != nil {
			if p.config.DebugLogging {
				panic(err)
			}
			return
		}
	}

	if p.config.ParseMuxRoute {
		err := p.fromMuxRoute(w, r)
		if err != nil {
			if p.config.DebugLogging {
				panic(err)
			}
			return
		}
	}

	p.inner.ServeHTTP(w, r)
}

func (p parselmouth) fromQuery(w http.ResponseWriter, r *http.Request) error {
	var obj = p.inner.GetObjectPointer()
	if p.config.DebugLogging {
		log.Println("parselmouth.fromQuery(): Got object:", obj)
	}

	var v QueryVisitor
	v.query = r.URL.Query()

	return p.nestedReflect(obj, p.config.QueryTag, v)
}

func (p parselmouth) fromMuxRoute(w http.ResponseWriter, r *http.Request) error {
	var obj = p.inner.GetObjectPointer()
	if p.config.DebugLogging {
		log.Println("parselmouth.fromMuxRoute(): Got object:", obj)
	}

	var v QueryVisitor
	v.query = r.URL.Query()

	return p.nestedReflect(obj, p.config.QueryTag, v)
}
