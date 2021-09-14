package games

import (
	"sync"
	"time"
)

type GameData struct {
	// Lock for doing operations on the game data.
	lock sync.Mutex

	// Identifier of the game in the internal database.
	GID uint64 `json:"game_id"`

	// What type of game this is.
	Mode GameMode `json:"mode"`

	// Who the owner of this game is.
	Owner uint64 `json:"owner"`

	// The internal game state.
	State ConfigurableState `json:"state"`

	// Mapping from database user id to player information.
	ToPlayer map[uint64]*PlayerData `json:"players"`

	// When starting the game and using a countdown, the current value of the
	// countdown.
	Countdown int `json:"countdown"`

	// Timer to ensure we delay between countdown events.
	CountdownTimer *time.Timer `json:"-"`
}

// Map a player identifier to Index.
func (data *GameData) ToUserID(index int) (uint64, bool) {
	for _, player := range data.ToPlayer {
		if player.Index == index {
			return player.UID, true
		}
	}

	return 0, false
}
func (data *GameData) ToUserIDs(indices []int) ([]uint64, bool) {
	players := make([]uint64, len(indices))
	for i, index := range indices {
		if player, ok := data.ToUserID(index); ok {
			players[i] = player
		} else {
			return players, false
		}
	}
	return players, true
}
