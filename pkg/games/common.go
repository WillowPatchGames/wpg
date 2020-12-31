package games

import (
	"fmt"
	"strings"
)

// GameMode describes which mode (type? style?) a given game is. This is a
// proxy for using string identifiers and is strongly typed instead.
type GameMode int

const (
	RushGame          GameMode = iota // 0
	SpadesGame        GameMode = iota // 1
	ThreeThirteenGame GameMode = iota // 2
)

func (gm GameMode) String() string {
	return []string{"rush", "spades", "three thirteen"}[gm]
}

// Convert the representation of a GameMode to a string.
func GameModeFromString(repr string) GameMode {
	switch strings.ToLower(repr) {
	case "rush":
		return RushGame
	case "spades":
		return SpadesGame
	case "three thirteen":
		return ThreeThirteenGame
	default:
		return -1
	}
}

func (gm GameMode) IsValid() bool {
	return gm == RushGame || gm == SpadesGame || gm == ThreeThirteenGame
}

// GameConfigError is a type of error specific for errors in the
// configuration; it documents which parameter was bad, what its
// bad value was, and what an allowed range of values were.
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
