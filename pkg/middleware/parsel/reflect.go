/*
 * Copyright (C) Alexander Scheel
 *
 * Licensed under the terms of the AGPLv3 license.
 */

package parsel

// This file handles the nasty business of handling reflection and walking a
// given interface and visiting it with the desired visitor, feeding that
// visitor the specified tag.
//
// So for example, we take the user's object and walk it with a QueryVisitor
// on the tag name "query" to allow for parsing query strings.

import (
	"errors"
	"log"
	"reflect"
	"strconv"
)

func (p parselmouth) nestedReflect(obj interface{}, tagKey string, v visitor) error {
	var vObj reflect.Value = reflect.ValueOf(obj)

	for vObj.Kind() == reflect.Ptr && !vObj.IsNil() {
		if p.config.DebugLogging {
			log.Println("parselmouth.nestedReflect(): Resolving object:", vObj.String())
		}

		vObj = vObj.Elem()
	}

	if vObj.Kind() == reflect.Ptr && vObj.IsNil() {
		return errors.New("parsel: invalid return from Parseltongue.GetObjectPointer: " + reflect.TypeOf(obj).String() + " -- eventual a nil pointer")
	}

	if vObj.Kind() != reflect.Struct {
		return errors.New("parsel: invalid return from Parseltongue.GetObjectPointer: " + reflect.TypeOf(obj).String() + " -- not eventually a struct")
	}

	var tObj reflect.Type = vObj.Type()

	if vObj.NumField() != tObj.NumField() {
		panic("parsel: unable to parse object with different number of fields in reflect.Value than reflect.Type(reflect.Value): " + reflect.TypeOf(obj).String())
	}

	for fieldI := 0; fieldI < tObj.NumField(); fieldI++ {
		var sfField reflect.StructField = tObj.Field(fieldI)
		var vField = vObj.Field(fieldI)

		if p.config.DebugLogging {
			log.Println("parselmouth.nestedReflect(): Parsing field[" + strconv.Itoa(fieldI) + "]: " + sfField.Name + " == " + vField.String())
		}

		for vField.Kind() == reflect.Ptr && !vField.IsNil() {
			if p.config.DebugLogging {
				log.Println("parselmouth.nestedReflect(): Resolving field object:", vField.String())
			}

			vField = vField.Elem()
		}

		if vField.Kind() == reflect.Struct && vField.CanInterface() {
			err := p.nestedReflect(vField.Interface(), tagKey, v)
			if err != nil {
				return err
			}

			continue
		}

		if !vField.CanSet() {
			if p.config.DebugLogging {
				log.Println("parselmouth.nestedReflect(): Skipping field[" + strconv.Itoa(fieldI) + "]: " + sfField.Name + " == " + vField.String())
			}

			continue
		}

		tagValue, present := sfField.Tag.Lookup(tagKey)
		if present {
			if p.config.DebugLogging {
				log.Println("parselmouth.nestedReflect(): Visiting field with tagKey `" + tagKey + "` present on field: " + strconv.Itoa(fieldI))
			}

			err := v.Visit(vField, tagValue, p.config.DebugLogging)
			if err != nil {
				return err
			}
		}
	}

	return nil
}
