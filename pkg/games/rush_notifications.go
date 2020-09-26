package games

import (
	"time"
)

type RushPlayerState struct {
	Board   LetterGrid   `json:"board,omitempty"`
	Hand    []LetterTile `json:"hand,omitempty"`
	Unwords []string     `json:"unwords,omitempty"`
}

type RushGameState struct {
	DrawID         int        `json:"draw_id"`
	Config         RushConfig `json:"config"`
	RemainingTiles int        `json:"remaining"`
	Started        bool       `json:"started"`
	Finished       bool       `json:"finished"`
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
	rsn.Unwords = game.Players[player].Board.FindUnwords()

	rsn.DrawID = game.DrawID
	rsn.Config = game.Config
	rsn.RemainingTiles = len(game.Tiles)
	rsn.Started = game.Started
	rsn.Finished = game.Finished

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
	rsn.Timestamp = uint64(time.Now().UnixNano() / int64(time.Millisecond))
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
	rdn.Timestamp = uint64(time.Now().UnixNano() / int64(time.Millisecond))

	rdn.Drawer = drawer
}

type RushCheckNotification struct {
	MessageHeader
	Error   string   `json:"error,omitempty"`
	Unwords []string `json:"unwords,omitempty"`
}

func (rcn *RushCheckNotification) LoadFromGame(game *RushState, player int) {
	rcn.Unwords = game.Players[player].Board.FindUnwords()
}

func (rcn *RushCheckNotification) LoadFromController(data *GameData, player *PlayerData, err error) {
	rcn.Mode = data.Mode.String()
	rcn.ID = data.GID
	rcn.Player = player.UID
	rcn.MessageType = "checked"
	rcn.MessageID = player.OutboundID
	player.OutboundID++
	rcn.Timestamp = uint64(time.Now().UnixNano() / int64(time.Millisecond))

	if err != nil {
		rcn.Error = err.Error()
	}
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
	rwn.Timestamp = uint64(time.Now().UnixNano() / int64(time.Millisecond))

	rwn.Winner = winner
}

type RushGameStateNotification struct {
	MessageHeader
	RushGameState

	Players   []RushPlayerState `json:"player_data"`
	PlayerMap map[int]uint64    `json:"player_map"`
	Winner    uint64            `json:"winner"`
	winner    int
}

func (rgsn *RushGameStateNotification) LoadFromGame(game *RushState) {
	rgsn.DrawID = game.DrawID
	rgsn.Config = game.Config
	rgsn.RemainingTiles = len(game.Tiles)
	rgsn.Started = game.Started
	rgsn.Finished = game.Finished

	rgsn.Players = make([]RushPlayerState, game.Config.NumPlayers)
	for index, player := range game.Players {
		rgsn.Players[index].Board = player.Board
		rgsn.Players[index].Hand = player.Hand
		rgsn.Players[index].Unwords = player.Board.FindUnwords()
	}

	rgsn.winner = game.Winner
}

func (rgsn *RushGameStateNotification) LoadFromController(data *GameData, player *PlayerData) {
	rgsn.Mode = data.Mode.String()
	rgsn.ID = data.GID
	rgsn.Player = player.UID
	rgsn.MessageType = "game-state"
	rgsn.MessageID = player.OutboundID
	player.OutboundID++
	rgsn.Timestamp = uint64(time.Now().UnixNano() / int64(time.Millisecond))

	rgsn.PlayerMap = make(map[int]uint64)
	for _, indexed_player := range data.ToPlayer {
		if indexed_player.Index >= 0 {
			rgsn.PlayerMap[indexed_player.Index] = indexed_player.UID

			if indexed_player.Index == rgsn.winner {
				rgsn.Winner = indexed_player.UID
			}
		}
	}
}
