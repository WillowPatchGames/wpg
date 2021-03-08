package games

import (
	"strings"
)

type HeartsPlayerState struct {
	Hand []Card `json:"hand"`

	HavePassed bool   `json:"have_passed"`
	Incoming   []Card `json:"incoming,omitempty"`

	Tricks     int `json:"tricks"`
	RoundScore int `json:"round_score"`
	Score      int `json:"score"`
}

type HeartsGameState struct {
	Turn   uint64 `json:"turn"`
	Leader uint64 `json:"leader"`
	Dealer uint64 `json:"dealer"`

	PassDirection HeartsPassDirection `json:"pass_direction"` // Direction to pass cards.
	Played        []Card              `json:"played"`
	WhoPlayed     []uint64            `json:"who_played"`
	HeartsBroken  bool                `json:"hearts_broken"`
	History       [][]Card            `json:"history"`

	Crib   []Card       `json:"crib"`
	Config HeartsConfig `json:"config"`

	Started  bool `json:"started"`
	Dealt    bool `json:"dealt"`
	Passed   bool `json:"passed"`
	Finished bool `json:"finished"`
}

type HeartsStateNotification struct {
	MessageHeader
	HeartsPlayerState
	HeartsGameState
}

func (hsn *HeartsStateNotification) LoadData(data *GameData, game *HeartsState, player *PlayerData) {
	hsn.LoadHeader(data, player)
	hsn.MessageType = "state"

	hsn.Hand = game.Players[player.Index].Hand
	hsn.HavePassed = game.Players[player.Index].Passed
	if hsn.HavePassed {
		hsn.Incoming = game.Players[player.Index].Incoming
	}

	hsn.Tricks = game.Players[player.Index].Tricks
	hsn.RoundScore = game.Players[player.Index].RoundScore
	hsn.Score = game.Players[player.Index].Score

	hsn.Turn, _ = data.ToUserID(game.Turn)
	hsn.Leader, _ = data.ToUserID(game.Leader)
	hsn.Dealer, _ = data.ToUserID(game.Dealer)

	hsn.PassDirection = game.PassDirection
	hsn.Played = game.Played
	if hsn.Played == nil {
		hsn.Played = make([]Card, 0)
	}

	hsn.WhoPlayed = make([]uint64, 0)
	for offset := 0; offset < len(game.Players); offset++ {
		player_index := (game.Leader + offset) % len(game.Players)
		player_uid, _ := data.ToUserID(player_index)
		hsn.WhoPlayed = append(hsn.WhoPlayed, player_uid)
	}

	hsn.HeartsBroken = game.HeartsBroken

	// Sometimes the crib isn't really visible, because it gets removed too
	// quickly.
	hsn.Crib = game.Crib
	if len(game.RoundHistory) > 0 {
		this_round := len(game.RoundHistory) - 1
		if len(game.RoundHistory[this_round].Tricks) > 1 {
			hsn.Crib = nil
		}
	}

	hsn.Config = game.Config

	hsn.Started = game.Started
	hsn.Dealt = game.Dealt
	hsn.Passed = game.Passed
	hsn.Finished = game.Finished

	if len(game.PreviousTricks) >= 1 {
		last_trick := game.PreviousTricks[len(game.PreviousTricks)-1]
		if len(last_trick) >= 1 {
			last_card := last_trick[len(last_trick)-1]
			hsn.History = make([][]Card, 1)
			hsn.History[0] = append(hsn.History[0], last_card)
		}
	}
}

type HeartsPlayerSynopsis struct {
	UID         uint64 `json:"user"`
	Playing     bool   `json:"playing"`
	PlayerIndex int    `json:"player_index"`

	IsTurn   bool `json:"is_turn"`
	IsLeader bool `json:"is_leader"`
	IsDealer bool `json:"is_dealer"`

	Tricks     int `json:"tricks"`
	RoundScore int `json:"round_score"`
	Score      int `json:"score"`
}

type HeartsSynopsisNotification struct {
	MessageHeader

	Players []HeartsPlayerSynopsis `json:"players"`

	PassDirection HeartsPassDirection `json:"pass_direction"` // Direction to pass cards.
	SuitIndicator string              `json:"suit"`
}

func (hsn *HeartsSynopsisNotification) LoadData(data *GameData, state *HeartsState, player *PlayerData) {
	hsn.LoadHeader(data, player)
	hsn.MessageType = "synopsis"

	for _, indexed_player := range data.ToPlayer {
		var synopsis HeartsPlayerSynopsis
		synopsis.UID = indexed_player.UID
		synopsis.Playing = indexed_player.Playing
		synopsis.PlayerIndex = indexed_player.Index

		if indexed_player.Index >= 0 {
			synopsis.IsTurn = indexed_player.Index == state.Turn
			synopsis.IsLeader = indexed_player.Index == state.Leader
			synopsis.IsDealer = indexed_player.Index == state.Dealer

			synopsis.Tricks = state.Players[indexed_player.Index].Tricks
			synopsis.RoundScore = state.Players[indexed_player.Index].RoundScore
			synopsis.Score = state.Players[indexed_player.Index].Score
		}

		hsn.Players = append(hsn.Players, synopsis)
	}

	hsn.PassDirection = state.PassDirection

	if !state.Dealt {
		hsn.SuitIndicator = "dealing"
	} else if !state.Passed {
		hsn.SuitIndicator = "passing"
	} else if len(state.Played) == 0 || len(state.Played) == len(state.Players) {
		hsn.SuitIndicator = "waiting"
	} else if len(state.Played) > 0 {
		hsn.SuitIndicator = state.Played[0].Suit.String()
		hsn.SuitIndicator = strings.TrimSuffix(hsn.SuitIndicator, "Suit")
	}
}

type HeartsPeekNotification struct {
	MessageHeader

	PlayerMapping []uint64 `json:"player_mapping"`

	// Info for Ended Games (Everyone)
	RoundHistory []*HeartsRound `json:"round_history"`

	// Info for Active Games (Spectators)
	Turn   uint64 `json:"turn"`
	Leader uint64 `json:"leader"`
	Dealer uint64 `json:"dealer"`

	PassDirection HeartsPassDirection `json:"pass_direction"` // Direction to pass cards.
	Played        []Card              `json:"played,omitempty"`
	WhoPlayed     []uint64            `json:"who_played,omitempty"`
	HeartsBroken  bool                `json:"hearts_broken"`
	PlayedHistory [][]Card            `json:"played_history,omitempty"`

	Started  bool `json:"started"`
	Dealt    bool `json:"dealt"`
	Passed   bool `json:"passed"`
	Finished bool `json:"finished"`

	Winner uint64 `json:"winner"`
}

func (hpn *HeartsPeekNotification) LoadData(data *GameData, game *HeartsState, player *PlayerData) {
	hpn.LoadHeader(data, player)
	hpn.MessageType = "game-state"

	for index := range game.Players {
		player_uid, _ := data.ToUserID(index)
		hpn.PlayerMapping = append(hpn.PlayerMapping, player_uid)
	}

	if !game.Finished {
		hpn.Turn, _ = data.ToUserID(game.Turn)
		hpn.Leader, _ = data.ToUserID(game.Leader)
		hpn.Dealer, _ = data.ToUserID(game.Dealer)

		hpn.PassDirection = game.PassDirection
		hpn.Played = game.Played

		hpn.WhoPlayed = make([]uint64, 0)
		for offset := 0; offset < len(game.Players); offset++ {
			player_index := (game.Leader + offset) % len(game.Players)
			player_uid, _ := data.ToUserID(player_index)
			hpn.WhoPlayed = append(hpn.WhoPlayed, player_uid)
		}

		hpn.HeartsBroken = game.HeartsBroken

		if len(game.PreviousTricks) >= 1 {
			last_trick := game.PreviousTricks[len(game.PreviousTricks)-1]
			if len(last_trick) >= 1 {
				last_card := last_trick[len(last_trick)-1]
				hpn.PlayedHistory = make([][]Card, 1)
				hpn.PlayedHistory[0] = append(hpn.PlayedHistory[0], last_card)
			}
		}

		// Allow spectators to see previous rounds before the game has ended.
		if len(game.RoundHistory) > 0 {
			hpn.RoundHistory = game.RoundHistory[:len(game.RoundHistory)-1]
		}
	} else {
		hpn.RoundHistory = game.RoundHistory
	}

	hpn.Started = game.Started
	hpn.Dealt = game.Dealt
	hpn.Passed = game.Passed
	hpn.Finished = game.Finished

	hpn.Winner, _ = data.ToUserID(game.Winner)
}

type HeartsFinishedNotification struct {
	MessageHeader

	Winner uint64 `json:"winner"`
}

func (hwn *HeartsFinishedNotification) LoadData(data *GameData, state *HeartsState, player *PlayerData) {
	hwn.LoadHeader(data, player)
	hwn.MessageType = "finished"

	hwn.Winner, _ = data.ToUserID(state.Winner)
}
