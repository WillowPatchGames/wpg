/*
 * Copyright (C) Alexander Scheel
 *
 * Licensed under the terms of the AGPLv3 license.
 */

package parsel

// RouteVisitor is a nestedReflect visitor implementation that handles
// parsing net/url's Query string values into their relevant struct fields.

import (
	"log"
	"reflect"
	"strconv"
	"strings"
)

type RouteVisitor struct {
	visitor

	vars map[string]string
}

func (r RouteVisitor) parseFieldTag(tag_data string) (string, bool, bool) {
	if tag_data == "-" || tag_data == "" {
		return "", false, false
	}

	var tag_parts []string = strings.Split(tag_data, ",")
	if len(tag_parts) == 0 {
		return "", false, false
	}

	var field_name string = tag_parts[0]
	var omitempty bool = false
	var present bool = false

	_, present = r.vars[field_name]

	if len(tag_parts) == 1 {
		return field_name, omitempty, present
	}

	for index, part := range tag_parts[1:] {
		if part == "omitempty" {
			omitempty = true
		} else {
			panic("unkown tag part at index " + strconv.Itoa(index+1) + ": `" + tag_data + "`: " + part)
		}
	}

	return field_name, omitempty, present
}

func (r RouteVisitor) Visit(field reflect.Value, tag_data string, debug bool) error {
	key, omitempty, present := r.parseFieldTag(tag_data)
	if !present {
		if debug {
			log.Println("tag not present in query string")
		}
		return nil
	}

	var value string = r.vars[key]

	if omitempty {
		if value == "" {
			return nil
		}
	}

	if field.Kind() == reflect.Bool {
		b_value, err := strconv.ParseBool(value)
		if err != nil {
			return err
		}

		if debug {
			log.Println("Set boolean value:", b_value)
		}

		field.SetBool(b_value)
	} else if field.Kind() == reflect.Int || field.Kind() == reflect.Int8 || field.Kind() == reflect.Int16 || field.Kind() == reflect.Int32 || field.Kind() == reflect.Int64 {
		i_value, err := strconv.ParseInt(value, 10, 64)
		if err != nil {
			return err
		}

		if debug {
			log.Println("Set int value:", i_value)
		}
		field.SetInt(i_value)
	} else if field.Kind() == reflect.Uint || field.Kind() == reflect.Uint8 || field.Kind() == reflect.Uint16 || field.Kind() == reflect.Uint32 || field.Kind() == reflect.Uint64 {
		u_value, err := strconv.ParseUint(value, 10, 64)
		if err != nil {
			return err
		}

		if debug {
			log.Println("Set uint value:", u_value)
		}

		field.SetUint(u_value)
	} else if field.Kind() == reflect.Float32 || field.Kind() == reflect.Float64 {
		f_value, err := strconv.ParseFloat(value, 64)
		if err != nil {
			return err
		}

		if debug {
			log.Println("Set float value:", f_value)
		}

		field.SetFloat(f_value)
	} else if field.Kind() == reflect.String {
		field.SetString(value)
	} else {
		panic(value)
	}

	return nil
}
