package games

import (
	"time"
)

type RushPlayerState struct {
	Board LetterGrid   `json:"board,omitempty"`
	Hand  []LetterTile `json:"hand,omitempty"`
}

type RushGameState struct {
	DrawID         int        `json:"draw_id"`
	Config         RushConfig `json:"config"`
	RemainingTiles int        `json:"remaining"`
}

type RushStateNotification struct {
	MessageHeader
	RushPlayerState
	RushGameState

	Added *RushPlayerState `json:"added,omitempty"`
}

func (rsn *RushStateNotification) LoadFromGame(game *RushState, player int) {
	rsn.Board = game.Players[player].Board
	rsn.Hand = game.Players[player].Hand

	rsn.DrawID = game.DrawID
	rsn.Config = game.Config
	rsn.RemainingTiles = len(game.Tiles)

	if len(game.Players[player].NewTiles) > 0 {
		rsn.Added = new(RushPlayerState)
		rsn.Added.Hand = game.Players[player].NewTiles
	}
	game.Players[player].NewTiles = make([]LetterTile, 0)
}

func (rsn *RushStateNotification) LoadFromController(data *GameData, player *PlayerData) {
	rsn.Mode = data.Mode.String()
	rsn.ID = data.GID
	rsn.Player = player.UID
	rsn.MessageType = "state"
	rsn.MessageID = player.OutboundID
	player.OutboundID++
	rsn.Timestamp = uint64(time.Now().Unix())
}
