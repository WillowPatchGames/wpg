/*
 * Copyright (C) Alexander Scheel
 *
 * Licensed under the terms of the AGPLv3 license.
 */

package figgy

import (
	"errors"
	"reflect"
)

type visitor interface {
	Visit(field reflect.Value, jsonValue string, configValue string, labelValue string) error
}

func nestedReflect(obj interface{}, configKey string, labelKey string, v visitor) error {
	var vObj reflect.Value = reflect.ValueOf(obj)

	for vObj.Kind() == reflect.Ptr && !vObj.IsNil() {
		vObj = vObj.Elem()
	}

	if vObj.Kind() == reflect.Ptr && vObj.IsNil() {
		return errors.New("figgy: invalid object during reflection: " + reflect.TypeOf(obj).String() + " -- eventual a nil pointer")
	}

	if vObj.Kind() != reflect.Struct {
		return errors.New("figgy: invalid object during reflection: " + reflect.TypeOf(obj).String() + " -- not eventually a struct")
	}

	var tObj reflect.Type = vObj.Type()

	if vObj.NumField() != tObj.NumField() {
		panic("figgy: unable to parse object with different number of fields in reflect.Value than reflect.Type(reflect.Value): " + reflect.TypeOf(obj).String())
	}

	for fieldI := 0; fieldI < tObj.NumField(); fieldI++ {
		var sfField reflect.StructField = tObj.Field(fieldI)
		var vField = vObj.Field(fieldI)

		for vField.Kind() == reflect.Ptr && !vField.IsNil() {
			vField = vField.Elem()
		}

		if vField.Kind() == reflect.Struct && vField.CanInterface() {
			err := nestedReflect(vField.Interface(), configKey, labelKey, v)
			if err != nil {
				return err
			}

			continue
		}

		if !vField.CanSet() {
			continue
		}

		jsonValue, jsonPresent := sfField.Tag.Lookup("json")
		configValue, configPresent := sfField.Tag.Lookup(configKey)
		labelValue, labelPresent := sfField.Tag.Lookup(labelKey)
		if jsonPresent && jsonValue != "-" {
			if !configPresent {
				return errors.New("figgy: unable to find " + configKey + " tag in field with non-empty JSON tag: " + jsonValue + " at field " + sfField.Name)
			}

			if !labelPresent {
				return errors.New("figgy: unable to find " + labelKey + " tag in field with non-empty JSON tag: " + jsonValue + " at field " + sfField.Name)
			}

			err := v.Visit(vField, jsonValue, configValue, labelValue)
			if err != nil {
				return err
			}
		}
	}

	return nil
}
