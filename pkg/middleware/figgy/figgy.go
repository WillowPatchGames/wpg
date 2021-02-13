/*
 * Copyright (C) Alexander Scheel
 *
 * Licensed under the terms of the AGPLv3 license.
 */

package figgy

import (
	"encoding/json"
)

// figgy is a library to handle automatically populating Go-struct backed
// configuration objects.

type Figgurable interface {
	Validate() error
}

func Parse(obj Figgurable, data []byte) error {
	if err := json.Unmarshal(data, obj); err != nil {
		return err
	}

	var v validator
	err := nestedReflect(obj, "config", "label", v)
	if err != nil {
		return err
	}

	return obj.Validate()
}

func Load(obj Figgurable, wire map[string]interface{}) error {
	var l loader
	l.Values = wire

	err := nestedReflect(obj, "config", "label", l)
	if err != nil {
		return err
	}

	return obj.Validate()
}

func Validate(obj Figgurable) error {
	var v validator
	err := nestedReflect(obj, "config", "label", v)
	if err != nil {
		return err
	}

	return obj.Validate()
}

func SerializeOptions(obj Figgurable) ([]map[string]interface{}, error) {
	var v serializer
	v.Output = new([]map[string]interface{})

	err := nestedReflect(obj, "config", "label", v)
	return *v.Output, err
}
