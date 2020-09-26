/*
 * Copyright (C) Alexander Scheel
 *
 * Licensed under the terms of the AGPLv3 license.
 */

package parsel

// RouteVisitor is a nestedReflect visitor implementation that handles
// parsing net/url's Query string values into their relevant struct fields.

import (
	"reflect"
	"strconv"
	"strings"
)

type RouteVisitor struct {
	visitor

	vars map[string]string
}

func (r RouteVisitor) parseFieldTag(tagData string) (string, bool, bool) {
	if tagData == "-" || tagData == "" {
		return "", false, false
	}

	var tagParts []string = strings.Split(tagData, ",")
	if len(tagParts) == 0 {
		return "", false, false
	}

	var fieldName string = tagParts[0]
	var omitempty bool = false
	var present bool = false

	_, present = r.vars[fieldName]

	if len(tagParts) == 1 {
		return fieldName, omitempty, present
	}

	for index, part := range tagParts[1:] {
		if part == "omitempty" {
			omitempty = true
		} else {
			panic("unkown tag part at index " + strconv.Itoa(index+1) + ": `" + tagData + "`: " + part)
		}
	}

	return fieldName, omitempty, present
}

func (r RouteVisitor) Visit(field reflect.Value, tagData string, debug bool) error {
	key, omitempty, present := r.parseFieldTag(tagData)
	if !present {
		return nil
	}

	var value string = r.vars[key]

	if omitempty {
		if value == "" {
			return nil
		}
	}

	if field.Kind() == reflect.Bool {
		bValue, err := strconv.ParseBool(value)
		if err != nil {
			return err
		}

		field.SetBool(bValue)
	} else if field.Kind() == reflect.Int || field.Kind() == reflect.Int8 || field.Kind() == reflect.Int16 || field.Kind() == reflect.Int32 || field.Kind() == reflect.Int64 {
		iValue, err := strconv.ParseInt(value, 10, 64)
		if err != nil {
			return err
		}

		field.SetInt(iValue)
	} else if field.Kind() == reflect.Uint || field.Kind() == reflect.Uint8 || field.Kind() == reflect.Uint16 || field.Kind() == reflect.Uint32 || field.Kind() == reflect.Uint64 {
		uValue, err := strconv.ParseUint(value, 10, 64)
		if err != nil {
			return err
		}

		field.SetUint(uValue)
	} else if field.Kind() == reflect.Float32 || field.Kind() == reflect.Float64 {
		fValue, err := strconv.ParseFloat(value, 64)
		if err != nil {
			return err
		}

		field.SetFloat(fValue)
	} else if field.Kind() == reflect.String {
		field.SetString(value)
	} else {
		panic(value)
	}

	return nil
}
