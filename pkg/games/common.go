package games

import (
	"fmt"
)

type GameConfigError struct {
	Parameter     string
	Value         string
	AllowedValues string
}

func (gce GameConfigError) Error() string {
	if len(gce.AllowedValues) > 0 {
		return fmt.Sprintf("Invalid value for parameter: %s has value %s; allowed: %s", gce.Parameter, gce.Value, gce.AllowedValues)
	}

	return fmt.Sprintf("Invalid value for parameter: %s has value %s", gce.Parameter, gce.Value)
}
