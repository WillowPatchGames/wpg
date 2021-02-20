package games

import (
	"fmt"
	"strings"

	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/figgy"
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
	GinGame           GameMode = iota // 5
)

func (gm GameMode) String() string {
	return []string{"rush", "spades", "three thirteen", "eight jacks", "hearts", "gin"}[gm]
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
	case "gin":
		return GinGame
	default:
		return -1
	}
}

func (gm GameMode) IsValid() bool {
	return gm == RushGame || gm == SpadesGame || gm == ThreeThirteenGame || gm == EightJacksGame || gm == HeartsGame || gm == GinGame
}

func (gm GameMode) NewState() ConfigurableState {
	switch gm {
	case RushGame:
		return &RushState{}
	case SpadesGame:
		return &SpadesState{}
	case ThreeThirteenGame:
		return &ThreeThirteenState{}
	case EightJacksGame:
		return &EightJacksState{}
	case HeartsGame:
		return &HeartsState{}
	case GinGame:
		return &GinState{}
	default:
		panic("Unable to create an empty state for this game mode")
	}
}

func (gm GameMode) Init(config figgy.Figgurable) (ConfigurableState, error) {
	switch gm {
	case RushGame:
		var asserted *RushConfig = config.(*RushConfig)
		var state = &RushState{}
		return state, state.Init(*asserted)
	case SpadesGame:
		var asserted *SpadesConfig = config.(*SpadesConfig)
		var state = &SpadesState{}
		return state, state.Init(*asserted)
	case ThreeThirteenGame:
		var asserted *ThreeThirteenConfig = config.(*ThreeThirteenConfig)
		var state = &ThreeThirteenState{}
		return state, state.Init(*asserted)
	case EightJacksGame:
		var asserted *EightJacksConfig = config.(*EightJacksConfig)
		var state = &EightJacksState{}
		return state, state.Init(*asserted)
	case HeartsGame:
		var asserted *HeartsConfig = config.(*HeartsConfig)
		var state = &HeartsState{}
		return state, state.Init(*asserted)
	case GinGame:
		var asserted *GinConfig = config.(*GinConfig)
		var state = &GinState{}
		return state, state.Init(*asserted)
	default:
		panic("Unable to create an initialized state for this game mode")
	}
}

func (gm GameMode) EmptyConfig() figgy.Figgurable {
	switch gm {
	case RushGame:
		return &RushConfig{}
	case SpadesGame:
		return &SpadesConfig{}
	case ThreeThirteenGame:
		return &ThreeThirteenConfig{}
	case EightJacksGame:
		return &EightJacksConfig{}
	case HeartsGame:
		return &HeartsConfig{}
	case GinGame:
		return &GinConfig{}
	default:
		panic("Unable to create an empty config for this game mode")
	}
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

type ConfigurableState interface {
	GetConfiguration() figgy.Figgurable
	ReInit() error
	IsStarted() bool
	IsFinished() bool
	ResetStatus()
}
