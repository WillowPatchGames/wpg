/*
 * Copyright (C) Alexander Scheel
 *
 * Licensed under the terms of the AGPLv3 license.
 */

package figgy

import (
	"reflect"
)

type loader struct {
	visitor

	Values map[string]interface{}
}

func (l loader) Visit(field reflect.Value, jsonValue string, configValue string, labelValue string) error {
	_, c_obj, _, err := parseFields(jsonValue, configValue, labelValue)
	if err != nil {
		return err
	}

	if err := c_obj.LoadValue(field, l.Values); err != nil {
		return err
	}

	return nil
}

type validator struct {
	visitor
}

func (v validator) Visit(field reflect.Value, jsonValue string, configValue string, labelValue string) error {
	_, c_obj, _, err := parseFields(jsonValue, configValue, labelValue)
	if err != nil {
		return err
	}

	if err := c_obj.ValidateValue(field); err != nil {
		return err
	}

	return nil
}

type serializer struct {
	visitor

	Output *[]map[string]interface{}
}

func (s serializer) Visit(field reflect.Value, jsonValue string, configValue string, labelValue string) error {
	name, c_obj, l_obj, err := parseFields(jsonValue, configValue, labelValue)
	if err != nil {
		return err
	}

	var result map[string]interface{} = make(map[string]interface{})
	result["name"] = name
	result["values"] = c_obj
	result["label"] = l_obj.GetDescription()

	output := append(*s.Output, result)
	*s.Output = output

	return nil
}
