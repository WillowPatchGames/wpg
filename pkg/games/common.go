package games

import (
	"errors"
	"fmt"
	"reflect"
	"strings"
)

// GameMode describes which mode (type? style?) a given game is. This is a
// proxy for using string identifiers and is strongly typed instead.
type GameMode int

const (
	RushGame          GameMode = iota // 0
	SpadesGame        GameMode = iota // 1
	ThreeThirteenGame GameMode = iota // 2
	EightJacksGame    GameMode = iota // 3
	HeartsGame        GameMode = iota // 4
)

func (gm GameMode) String() string {
	return []string{"rush", "spades", "three thirteen", "eight jacks", "hearts"}[gm]
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
	case "eight jacks":
		return EightJacksGame
	case "hearts":
		return HeartsGame
	default:
		return -1
	}
}

func (gm GameMode) IsValid() bool {
	return gm == RushGame || gm == SpadesGame || gm == ThreeThirteenGame || gm == EightJacksGame || gm == HeartsGame
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

// GameConfig is a set of common game configuration options.
type GameConfig struct {
	Countdown bool `json:"countdown" type:bool,default:true" label:"true:Show a 3... 2... 1... countdown before beginning,false:Start the game instantly"` // Whether to wait and send countdown messages.
}

func IntConfig(wire map[string]interface{}, key string, value *int, default_value int) error {
	if wire_value, ok := wire[key]; ok {
		if float_value, ok := wire_value.(float64); ok {
			*value = int(float_value)
		} else {
			return errors.New("unable to parse value for " + key + "as integer: " + reflect.TypeOf(wire_value).String())
		}
	} else {
		*value = default_value
	}

	return nil
}

func BoolConfig(wire map[string]interface{}, key string, value *bool, default_value bool) error {
	if wire_value, ok := wire[key]; ok {
		if bool_value, ok := wire_value.(bool); ok {
			*value = bool_value
		} else {
			return errors.New("unable to parse value for " + key + " as bool: " + reflect.TypeOf(wire_value).String())
		}
	} else {
		*value = default_value
	}

	return nil
}
