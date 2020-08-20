/*
 * Copyright (C) Alexander Scheel
 *
 * Licensed under the terms of the AGPLv3 license.
 */

package parsel

// QueryVisitor is a nestedReflect visitor implementation that handles
// parsing net/url's Query string values into their relevant struct fields.

import (
	"log"
	"net/url"
	"reflect"
	"strconv"
	"strings"
)

type QueryVisitor struct {
	visitor

	query url.Values
}

func (q QueryVisitor) parseFieldTag(tag_data string) (string, int, int, bool, bool) {
	if tag_data == "-" || tag_data == "" {
		return "", 0, -1, false, false
	}

	var tag_parts []string = strings.Split(tag_data, ",")
	if len(tag_parts) == 0 {
		return "", 0, -1, false, false
	}

	var field_name string = tag_parts[0]
	var field_start_index = 0
	var field_end_index = -1
	var omitempty bool = false
	var present bool = false

	var err error

	var match_index = strings.IndexByte(tag_parts[0], '[')
	if match_index != -1 {
		var end_index = strings.IndexByte(tag_parts[0][match_index:], ']')
		var range_index = strings.IndexByte(tag_parts[0][match_index:], ':')

		if end_index == -1 {
			panic("malformed tag_data on field: `" + tag_data + "`")
		}

		if range_index > end_index || len(tag_parts[0]) > end_index {
			panic("extraneous data after end of index selector: `" + tag_data + "`")
		}

		if range_index == -1 {
			var substr = tag_parts[0][match_index+1 : end_index-1]

			field_name = tag_parts[0][0 : match_index-1]
			field_start_index, err = strconv.Atoi(substr)
			if err != nil {
				panic("error parsing index of tag data: `" + tag_data + "`")
			}

			field_end_index, err = strconv.Atoi(substr)
			if err != nil {
				panic("error parsing index of tag data: `" + tag_data + "`")
			}
		} else {
			var start_substr = tag_parts[0][match_index+1 : range_index-1]
			var end_substr = tag_parts[0][range_index+1 : end_index-1]

			field_name = tag_parts[0][0 : match_index-1]
			field_start_index, err = strconv.Atoi(start_substr)
			if err != nil {
				panic("error parsing index of tag data: `" + tag_data + "`")
			}

			field_end_index, err = strconv.Atoi(end_substr)
			if err != nil {
				panic("error parsing index of tag data: `" + tag_data + "`")
			}
		}
	}

	if field_end_index >= 0 && field_end_index < field_start_index {
		var message = "error parsing index data: end before start: `"
		message += tag_data + "`: " + strconv.Itoa(field_start_index)
		message += " to " + strconv.Itoa(field_end_index)
		panic(message)
	}

	var values []string
	values, present = q.query[field_name]

	if present && len(values) <= field_start_index {
		// This index isn't present
		return field_name, field_start_index, field_end_index, omitempty, false
	}

	if len(values) < field_end_index {
		field_end_index = len(values)
	}

	if len(tag_parts) == 1 {
		return field_name, field_start_index, field_end_index, omitempty, present
	}

	for index, part := range tag_parts[1:] {
		if part == "omitempty" {
			omitempty = true
		} else {
			panic("unkown tag part at index " + strconv.Itoa(index+1) + ": `" + tag_data + "`: " + part)
		}
	}

	return field_name, field_start_index, field_end_index, omitempty, present
}

func (q QueryVisitor) Visit(field reflect.Value, tag_data string, debug bool) error {
	key, start, end, omitempty, present := q.parseFieldTag(tag_data)
	if !present {
		if debug {
			log.Println("tag not present in query string")
		}
		return nil
	}

	if omitempty {
		if start == 0 && end == -1 {
			// Check only the first value
			if q.query.Get(key) == "" {
				return nil
			}
		}

		if start == end || start == end-1 {
			if q.query[key][start] == "" {
				return nil
			}
		}

		if (end - start) > 1 {
			var empty = true
			for _, value := range q.query[key][start:end] {
				if value != "" {
					empty = false
				}
			}

			if empty {
				return nil
			}
		}
	}

	var s_value string
	var a_value []string

	if start == 0 && end == -1 {
		s_value = q.query.Get(key)
		a_value = q.query[key]
	} else if (start - end) == 0 {
		s_value = q.query[key][start]
		a_value = []string{q.query[key][start]}
	} else if (start - end) == 1 {
		s_value = q.query[key][start]
		a_value = []string{q.query[key][start]}
	}

	if field.Kind() == reflect.Bool {
		b_value, err := strconv.ParseBool(s_value)
		if err != nil {
			return err
		}

		if debug {
			log.Println("Set boolean value:", b_value)
		}

		field.SetBool(b_value)
	} else if field.Kind() == reflect.Int || field.Kind() == reflect.Int8 || field.Kind() == reflect.Int16 || field.Kind() == reflect.Int32 || field.Kind() == reflect.Int64 {
		i_value, err := strconv.ParseInt(s_value, 10, 64)
		if err != nil {
			return err
		}

		if debug {
			log.Println("Set int value:", i_value)
		}
		field.SetInt(i_value)
	} else if field.Kind() == reflect.Uint || field.Kind() == reflect.Uint8 || field.Kind() == reflect.Uint16 || field.Kind() == reflect.Uint32 || field.Kind() == reflect.Uint64 {
		u_value, err := strconv.ParseUint(s_value, 10, 64)
		if err != nil {
			return err
		}

		if debug {
			log.Println("Set uint value:", u_value)
		}

		field.SetUint(u_value)
	} else if field.Kind() == reflect.Float32 || field.Kind() == reflect.Float64 {
		f_value, err := strconv.ParseFloat(s_value, 64)
		if err != nil {
			return err
		}

		if debug {
			log.Println("Set float value:", f_value)
		}

		field.SetFloat(f_value)
	} else if field.Kind() == reflect.String {
		field.SetString(s_value)
	} else {
		panic(a_value)
	}

	return nil
}
