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

			err := v.Visit(v_field, tag_value, p.config.DebugLogging)
			if err != nil {
				return err
			}
		}
	}

	return nil
}
