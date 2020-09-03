package games

import (
	"fmt"
	"strings"
)

type GameMode int

const (
	RushGame GameMode = iota
)

func (gm GameMode) String() string {
	return []string{"rush"}[gm]
}

func GameModeFromString(repr string) GameMode {
	switch strings.ToLower(repr) {
	case "rush":
		return RushGame
	default:
		return -1
	}
}

func (gm GameMode) IsValid() bool {
	return gm == RushGame
}

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
