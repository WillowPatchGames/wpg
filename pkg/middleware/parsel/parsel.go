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
	// "encoding/json"
	"errors"
	"log"
	"net/http"
	"net/url"
	"reflect"
	"strconv"

	// "github.com/gorilla/schema"
)

type Parseltongue interface {
	http.Handler

	GetObjectPointer() interface{}
}

type ParselConfig struct {
	AllowUnmatchedFields   bool
	DisallowUnmatchedQuery bool
	DebugLogging           bool
}

type parselmouth struct {
	http.Handler

	inner  Parseltongue
	config ParselConfig
}

func Wrap(inner Parseltongue, config ParselConfig) http.Handler {
	var ret = new(parselmouth)
	ret.inner = inner
	ret.config = config
	return ret
}

func (p parselmouth) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	log.Println("Got request: ")

	err := p.fromQuery(w, r)
	if err != nil {
		panic(err)
	}

	p.inner.ServeHTTP(w, r)
}

type visitor interface {
	Visit(field reflect.Value, tag_data string) error
}

type QueryVisitor struct {
	visitor

	query url.Values
}

func (q QueryVisitor) Visit(field reflect.Value, tag_data string) error {
	var t_field = field.Type()

	log.Println("parselmouth.QueryVisitor.Visit(): HERE: " + t_field.Name())

	return nil
}

func (p parselmouth) fromQuery(w http.ResponseWriter, r *http.Request) error {
	var obj = p.inner.GetObjectPointer()
	if p.config.DebugLogging {
		log.Println("parselmouth.fromQuery(): Got object:", obj)
	}

	var v QueryVisitor
	v.query = r.URL.Query()

	return p.nestedReflect(obj, "query", v)
}

func (p parselmouth) nestedReflect(obj interface{}, tag_key string, v visitor) error {
	var v_obj reflect.Value = reflect.ValueOf(obj)

	for v_obj.Kind() == reflect.Ptr && !v_obj.IsNil() {
		if p.config.DebugLogging {
			log.Println("parselmouth.nestedReflect(): Resolving object:", v_obj.String())
		}

		v_obj = v_obj.Elem()
	}

	if v_obj.Kind() == reflect.Ptr && v_obj.IsNil() {
		return errors.New("parsel: invalid return from Parseltongue.GetObjectPointer: " + reflect.TypeOf(obj).String() + " -- eventual a nil pointer")
	}

	if v_obj.Kind() != reflect.Struct {
		return errors.New("parsel: invalid return from Parseltongue.GetObjectPointer: " + reflect.TypeOf(obj).String() + " -- not eventually a struct")
	}

	var t_obj reflect.Type = v_obj.Type()

	if v_obj.NumField() != t_obj.NumField() {
		panic("parsel: unable to parse object with different number of fields in reflect.Value than reflect.Type(reflect.Value): " + reflect.TypeOf(obj).String())
	}

	for field_i := 0; field_i < t_obj.NumField(); field_i++ {
		var sf_field reflect.StructField = t_obj.Field(field_i)
		var v_field = v_obj.Field(field_i)

		if p.config.DebugLogging {
			log.Println("parselmouth.nestedReflect(): Parsing field[" + strconv.Itoa(field_i) + "]: " + sf_field.Name + " == " + v_field.String())
		}

		for v_field.Kind() == reflect.Ptr && !v_field.IsNil() {
			if p.config.DebugLogging {
				log.Println("parselmouth.nestedReflect(): Resolving field object:", v_field.String())
			}

			v_field = v_field.Elem()
		}

		if v_field.Kind() == reflect.Struct && v_field.CanInterface() {
			err := p.nestedReflect(v_field.Interface(), tag_key, v)
			if err != nil {
				return err
			}

			continue
		}

		if !v_field.CanSet() {
			if p.config.DebugLogging {
				log.Println("parselmouth.nestedReflect(): Skipping field[" + strconv.Itoa(field_i) + "]: " + sf_field.Name + " == " + v_field.String())
			}

			continue
		}

		tag_value, present := sf_field.Tag.Lookup(tag_key)
		if present {
			if p.config.DebugLogging {
				log.Println("parselmouth.nestedReflect(): Visiting field with tag_key `" + tag_key + "` present on field: " + strconv.Itoa(field_i))
			}

			err := v.Visit(v_field, tag_value)
			if err != nil {
				return err
			}
		}
	}

	return nil
}
