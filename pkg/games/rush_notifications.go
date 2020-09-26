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

type RushDrawNotification struct {
	MessageHeader

	Drawer uint64 `json:"drawer"`
}

func (rdn *RushDrawNotification) LoadFromController(data *GameData, player *PlayerData, drawer uint64) {
	rdn.Mode = data.Mode.String()
	rdn.ID = data.GID
	rdn.Player = player.UID
	rdn.MessageType = "draw"
	rdn.MessageID = player.OutboundID
	player.OutboundID++
	rdn.Timestamp = uint64(time.Now().Unix())

	rdn.Drawer = drawer
}

type RushFinishedNotification struct {
	MessageHeader

	Winner uint64 `json:"winner"`
}

func (rwn *RushFinishedNotification) LoadFromController(data *GameData, player *PlayerData, winner uint64) {
	rwn.Mode = data.Mode.String()
	rwn.ID = data.GID
	rwn.Player = player.UID
	rwn.MessageType = "finished"
	rwn.MessageID = player.OutboundID
	player.OutboundID++
	rwn.Timestamp = uint64(time.Now().Unix())

	rwn.Winner = winner
}
