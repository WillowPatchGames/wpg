/*
 * Copyright (C) Alexander Scheel
 *
 * Licensed under the terms of the AGPLv3 license.
 */

package figgy

import (
	"errors"
	"fmt"
	"reflect"
	"strconv"
	"strings"
)

type configurable interface {
	ValidateValue(field reflect.Value) error
	LoadValue(field reflect.Value, values map[string]interface{}) error

	GetType() string
}

type labelable interface {
	GetType() string
	GetDescription() interface{}
}

type intConfigTag struct {
	Type    string `json:"type"`
	Field   string `json:"-"`
	Min     int    `json:"min"`
	Default int    `json:"default"`
	Max     int    `json:"max"`
	Step    int    `json:"step"`
}

func (ict *intConfigTag) LoadValue(field reflect.Value, values map[string]interface{}) error {
	if values == nil {
		return errors.New("passed nil value map")
	}

	var value int = ict.Default

	if wire_value, ok := values[ict.Field]; ok {
		if float_value, ok := wire_value.(float64); ok {
			value = int(float_value)
		} else {
			return errors.New("unable to parse value for " + ict.Field + " as integer: " + reflect.TypeOf(wire_value).String())
		}
	}

	if err := ict.validateValue(value); err != nil {
		return err
	}

	field.SetInt(int64(value))

	return nil
}

func (ict *intConfigTag) ValidateValue(field reflect.Value) error {
	value := int(field.Int())
	return ict.validateValue(value)
}

func (ict *intConfigTag) validateValue(value int) error {
	if value < ict.Min || value > ict.Max {
		return fmt.Errorf("invalid value for parameter: %s has value %d; allowed between %d and %d", ict.Field, value, ict.Min, ict.Max)
	}

	return nil
}

func (ict *intConfigTag) GetType() string {
	return ict.Type
}

type boolConfigTag struct {
	Type    string `json:"type"`
	Field   string `json:"-"`
	Default bool   `json:"default"`
}

func (bct *boolConfigTag) LoadValue(field reflect.Value, values map[string]interface{}) error {
	if values == nil {
		return errors.New("passed nil value map")
	}

	var value bool = bct.Default

	if wire_value, ok := values[bct.Field]; ok {
		if bool_value, ok := wire_value.(bool); ok {
			value = bool_value
		} else {
			return errors.New("unable to parse value for " + bct.Field + " as bool: " + reflect.TypeOf(wire_value).String())
		}
	}

	field.SetBool(value)

	return nil
}

func (bct *boolConfigTag) ValidateValue(field reflect.Value) error {
	return nil
}

func (bct *boolConfigTag) GetType() string {
	return bct.Type
}

type selectOption struct {
	Label string `json:"label"`
	Value string `json:"value"`
}

type enumConfigTag struct {
	Type    string         `json:"type"`
	Field   string         `json:"-"`
	Default string         `json:"default"`
	Options []selectOption `json:"options"`
}

func (ect *enumConfigTag) LoadValue(field reflect.Value, values map[string]interface{}) error {
	if values == nil {
		return errors.New("passed nil value map")
	}

	var value int
	value, err := strconv.Atoi(ect.Default)
	if err != nil {
		return errors.New("bad default value: " + ect.Default + ": can't parse as int: " + err.Error())
	}

	if wire_value, ok := values[ect.Field]; ok {
		if float_value, ok := wire_value.(float64); ok {
			value = int(float_value)
		} else if string_value, ok := wire_value.(string); ok {
			value, err = strconv.Atoi(string_value)
			if err != nil {
				return errors.New("unable to parse value for " + ect.Field + " as integer: " + err.Error())
			}
		} else {
			return errors.New("unable to parse value for " + ect.Field + " as integer: " + reflect.TypeOf(wire_value).String())
		}
	}

	if err := ect.validateValue(value); err != nil {
		return err
	}

	field.SetInt(int64(value))

	return nil
}

func (ect *enumConfigTag) ValidateValue(field reflect.Value) error {
	value := int(field.Int())
	return ect.validateValue(value)
}

func (ect *enumConfigTag) validateValue(value int) error {
	var found = false
	for _, option := range ect.Options {
		if strconv.Itoa(value) == option.Value {
			found = true
			break
		}
	}

	if !found {
		return fmt.Errorf("invalid value for parameter: %s has value %d; outside of allowed range", ect.Field, value)
	}

	return nil
}

func (ect *enumConfigTag) GetType() string {
	return ect.Type
}

type labelTag struct {
	Type  string
	Field string
	Label string
}

func (lt *labelTag) GetType() string {
	return lt.Type
}

func (lt *labelTag) GetDescription() interface{} {
	return lt.Label
}

type boolLabelTag struct {
	Type  string
	Field string
	Label struct {
		TrueLabel  string `json:"true"`
		FalseLabel string `json:"false"`
	}
}

func (blt *boolLabelTag) GetType() string {
	return blt.Type
}

func (blt *boolLabelTag) GetDescription() interface{} {
	return blt.Label
}

func findKeyValue(field string, parts []string, key string) (string, error) {
	var result string

	for _, piece := range parts {
		piece = strings.TrimSpace(piece)

		if len(piece) < len(key)+1 {
			continue
		}

		if piece[0:len(key)+1] == key+":" {
			if len(result) != 0 {
				return "", errors.New("duplicate values for " + key + " in field " + field + ": " + result + " and " + piece[5:])
			}

			result = piece[len(key)+1:]
		}
	}

	if result == "" {
		return "", errors.New("unable to find " + key + " in field " + field)
	}

	return result, nil
}

func findKeyValueWithDefault(field string, parts []string, key string, defaultValue string) (string, error) {
	var result string

	for _, piece := range parts {
		piece = strings.TrimSpace(piece)

		if len(piece) < len(key)+1 {
			continue
		}

		if piece[0:len(key)+1] == key+":" {
			if len(result) != 0 {
				return "", errors.New("duplicate values for " + key + " in field " + field + ": " + result + " and " + piece[5:])
			}

			result = piece[len(key)+1:]
		}
	}

	if result == "" {
		result = defaultValue
	}

	return result, nil
}

func parseConfigField(field string, config string) (configurable, error) {
	split := strings.Split(config, ",")

	c_type, err := findKeyValue(field, split, "type")
	if err != nil {
		return nil, err
	}

	if c_type == "int" {
		s_min, err := findKeyValue(field, split, "min")
		if err != nil {
			return nil, err
		}

		s_max, err := findKeyValue(field, split, "max")
		if err != nil {
			return nil, err
		}

		s_default, err := findKeyValue(field, split, "default")
		if err != nil {
			return nil, err
		}

		s_step, err := findKeyValueWithDefault(field, split, "step", "1")
		if err != nil {
			return nil, err
		}

		i_min, err := strconv.Atoi(s_min)
		if err != nil {
			return nil, err
		}

		i_max, err := strconv.Atoi(s_max)
		if err != nil {
			return nil, err
		}

		i_default, err := strconv.Atoi(s_default)
		if err != nil {
			return nil, err
		}

		i_step, err := strconv.Atoi(s_step)
		if err != nil {
			return nil, err
		}

		return &intConfigTag{
			Type:    c_type,
			Field:   field,
			Min:     i_min,
			Default: i_default,
			Max:     i_max,
			Step:    i_step,
		}, nil
	} else if c_type == "bool" {
		s_default, err := findKeyValueWithDefault(field, split, "default", "false")
		if err != nil {
			return nil, err
		}

		b_default, err := strconv.ParseBool(s_default)
		if err != nil {
			return nil, err
		}

		return &boolConfigTag{
			Type:    c_type,
			Field:   field,
			Default: b_default,
		}, nil
	} else if c_type == "enum" {
		s_default, err := findKeyValue(field, split, "default")
		if err != nil {
			return nil, err
		}

		s_options, err := findKeyValue(field, split, "options")
		if err != nil {
			return nil, err
		}

		sa_options := strings.Split(s_options, ";")
		var o_options = make([]selectOption, 0)

		for index, option := range sa_options {
			sa_option := strings.SplitN(option, ":", 2)
			if len(sa_option) != 2 {
				return nil, errors.New("unable to parse value of enum option for field " + field + " at index " + strconv.Itoa(index) + " -- bad value: " + option)
			}

			var o_option = selectOption{
				Value: sa_option[0],
				Label: sa_option[1],
			}
			o_options = append(o_options, o_option)
		}

		return &enumConfigTag{
			Type:    c_type,
			Field:   field,
			Default: s_default,
			Options: o_options,
		}, nil
	}

	return nil, errors.New("unknown type of config field " + field + ": " + c_type)
}

func parseLabelField(field string, config_type string, label string) (labelable, error) {
	split := strings.Split(label, ",")

	if config_type == "int" || config_type == "enum" {
		return &labelTag{
			Type:  config_type,
			Field: field,
			Label: label,
		}, nil
	} else if config_type == "bool" {
		s_true, err := findKeyValue(field, split, "true")
		if err != nil {
			return nil, err
		}

		s_false, err := findKeyValue(field, split, "false")
		if err != nil {
			return nil, err
		}

		result := &boolLabelTag{
			Type:  config_type,
			Field: field,
		}
		result.Label.TrueLabel = s_true
		result.Label.FalseLabel = s_false

		return result, nil
	}

	return nil, errors.New("unknown type of label field " + field + ": " + config_type)
}

func parseFields(jsonValue, config, label string) (string, configurable, labelable, error) {
	field := strings.Split(jsonValue, ",")[0]

	config_obj, err := parseConfigField(field, config)
	if err != nil {
		return "", nil, nil, err
	}

	label_obj, err := parseLabelField(field, config_obj.GetType(), label)
	if err != nil {
		return "", nil, nil, err
	}

	return field, config_obj, label_obj, err
}
