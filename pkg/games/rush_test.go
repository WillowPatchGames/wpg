package games

import (
	"testing"
)

func TestRushGame(t *testing.T) {
	var config RushConfig
	config.NumPlayers = 4
	config.NumTiles = 144
	config.TilesPerPlayer = false
	config.StartSize = 13
	config.DrawSize = 1
	config.DiscardPenalty = 3
	config.Frequency = BananagramsFreq

	if err := config.Validate(); err != nil {
		t.Error("Unable to validate good configuration", err)
	}

	var game RushState
	if err := game.Init(config); err != nil {
		t.Error("Unable to initialize game with good configration", err)
	}
}
