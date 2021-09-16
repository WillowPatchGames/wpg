package games

import (
	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
)

type PlayerData struct {
	// Identifier of the user in the internal database.
	UID uint64 `json:"user_id"`

	// Index of this player in the internal game state, because they use an
	// array of players instead of using the uid.
	Index int `json:"index"`

	// Whether or not this player has been admitted to this game. This lets them
	// see notifications about the game.
	Admitted bool `json:"admitted"`

	// Whether or not this player is playing the game or is a spectator.
	Playing bool `json:"playing"`

	// Whether or not the player is ready for the game to begin.
	Ready bool `json:"ready"`

	// All previously seen incoming messages from this player to the server.
	InboundMsgs []*database.GameMessage `json:"-"`

	// Highest (last issued) outbound message identifier to this player.
	OutboundID int `json:"outbound_id"`

	// All previously sent messages from the server to this player.
	OutboundMsgs []*database.GameMessage `json:"-"`

	// When the game is starting, we do a full round-trip for countdown events.
	// This ensures that everyone listening is actively participating and that
	// nobody is missing.
	Countback int `json:"countdown"`

	// Notifications to undispatch. Once processed above, data can be queued here
	// until Undispatch is called by the Websocket. This isn't persisted as we
	// don't need to access it.
	Notifications map[uint64]chan interface{} `json:"-"`

	// Bound players is a two-way authorization (mutual verification) of
	// player <-> spectator binding, allowing the spectator to perform certain
	// actions on behalf of this player (such as choosing a square to play on
	// in 8Js, given the specified card selected by the player). This is a
	// list of UIDs of other PlayerData units.
	BoundPlayers []uint64 `json:"bound_players"`
}

func (p *PlayerData) IsBound(uid uint64) bool {
	for _, value := range p.BoundPlayers {
		if value == uid {
			return true
		}
	}

	return false
}

func (p *PlayerData) Unbind(uid uint64) bool {
	var remaining []uint64 = nil
	var remainder_index = -1

	for index, value := range p.BoundPlayers {
		if value == uid {
			remaining = p.BoundPlayers[:index]
			remainder_index = index + 1
		}
	}

	if remainder_index != -1 && remainder_index < len(p.BoundPlayers) {
		remaining = append(remaining, p.BoundPlayers[remainder_index:]...)
	}

	if remaining != nil {
		p.BoundPlayers = remaining
	}

	return remainder_index != -1
}
