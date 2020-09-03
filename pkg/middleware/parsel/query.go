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

func (q QueryVisitor) parseFieldTag(tagData string) (string, int, int, bool, bool) {
	if tagData == "-" || tagData == "" {
		return "", 0, -1, false, false
	}

	var tagParts []string = strings.Split(tagData, ",")
	if len(tagParts) == 0 {
		return "", 0, -1, false, false
	}

	var fieldName string = tagParts[0]
	var fieldStartIndex = 0
	var fieldEndIndex = -1
	var omitempty bool = false
	var present bool = false

	var err error

	var matchIndex = strings.IndexByte(tagParts[0], '[')
	if matchIndex != -1 {
		var endIndex = strings.IndexByte(tagParts[0][matchIndex:], ']')
		var rangeIndex = strings.IndexByte(tagParts[0][matchIndex:], ':')

		if endIndex == -1 {
			panic("malformed tagData on field: `" + tagData + "`")
		}

		if rangeIndex > endIndex || len(tagParts[0]) > endIndex {
			panic("extraneous data after end of index selector: `" + tagData + "`")
		}

		if rangeIndex == -1 {
			var substr = tagParts[0][matchIndex+1 : endIndex-1]

			fieldName = tagParts[0][0 : matchIndex-1]
			fieldStartIndex, err = strconv.Atoi(substr)
			if err != nil {
				panic("error parsing index of tag data: `" + tagData + "`")
			}

			fieldEndIndex, err = strconv.Atoi(substr)
			if err != nil {
				panic("error parsing index of tag data: `" + tagData + "`")
			}
		} else {
			var startSubstr = tagParts[0][matchIndex+1 : rangeIndex-1]
			var endSubstr = tagParts[0][rangeIndex+1 : endIndex-1]

			fieldName = tagParts[0][0 : matchIndex-1]
			fieldStartIndex, err = strconv.Atoi(startSubstr)
			if err != nil {
				panic("error parsing index of tag data: `" + tagData + "`")
			}

			fieldEndIndex, err = strconv.Atoi(endSubstr)
			if err != nil {
				panic("error parsing index of tag data: `" + tagData + "`")
			}
		}
	}

	if fieldEndIndex >= 0 && fieldEndIndex < fieldStartIndex {
		var message = "error parsing index data: end before start: `"
		message += tagData + "`: " + strconv.Itoa(fieldStartIndex)
		message += " to " + strconv.Itoa(fieldEndIndex)
		panic(message)
	}

	var values []string
	values, present = q.query[fieldName]

	if present && len(values) <= fieldStartIndex {
		// This index isn't present
		return fieldName, fieldStartIndex, fieldEndIndex, omitempty, false
	}

	if len(values) < fieldEndIndex {
		fieldEndIndex = len(values)
	}

	if len(tagParts) == 1 {
		return fieldName, fieldStartIndex, fieldEndIndex, omitempty, present
	}

	for index, part := range tagParts[1:] {
		if part == "omitempty" {
			omitempty = true
		} else {
			panic("unkown tag part at index " + strconv.Itoa(index+1) + ": `" + tagData + "`: " + part)
		}
	}

	return fieldName, fieldStartIndex, fieldEndIndex, omitempty, present
}

func (q QueryVisitor) Visit(field reflect.Value, tagData string, debug bool) error {
	key, start, end, omitempty, present := q.parseFieldTag(tagData)
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

	var sValue string
	var aValue []string

	if start == 0 && end == -1 {
		sValue = q.query.Get(key)
		aValue = q.query[key]
	} else if (start - end) == 0 {
		sValue = q.query[key][start]
		aValue = []string{q.query[key][start]}
	} else if (start - end) == 1 {
		sValue = q.query[key][start]
		aValue = []string{q.query[key][start]}
	}

	if field.Kind() == reflect.Bool {
		bValue, err := strconv.ParseBool(sValue)
		if err != nil {
			return err
		}

		if debug {
			log.Println("Set boolean value:", bValue)
		}

		field.SetBool(bValue)
	} else if field.Kind() == reflect.Int || field.Kind() == reflect.Int8 || field.Kind() == reflect.Int16 || field.Kind() == reflect.Int32 || field.Kind() == reflect.Int64 {
		iValue, err := strconv.ParseInt(sValue, 10, 64)
		if err != nil {
			return err
		}

		if debug {
			log.Println("Set int value:", iValue)
		}
		field.SetInt(iValue)
	} else if field.Kind() == reflect.Uint || field.Kind() == reflect.Uint8 || field.Kind() == reflect.Uint16 || field.Kind() == reflect.Uint32 || field.Kind() == reflect.Uint64 {
		uValue, err := strconv.ParseUint(sValue, 10, 64)
		if err != nil {
			return err
		}

		if debug {
			log.Println("Set uint value:", uValue)
		}

		field.SetUint(uValue)
	} else if field.Kind() == reflect.Float32 || field.Kind() == reflect.Float64 {
		fValue, err := strconv.ParseFloat(sValue, 64)
		if err != nil {
			return err
		}

		if debug {
			log.Println("Set float value:", fValue)
		}

		field.SetFloat(fValue)
	} else if field.Kind() == reflect.String {
		field.SetString(sValue)
	} else {
		panic(aValue)
	}

	return nil
}
