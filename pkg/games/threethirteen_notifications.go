package games

type ThreeThirteenPlayerState struct {
	Hand []Card `json:"hand,omitempty"`

	Drawn           *Card `json:"drawn,omitempty"`
	PickedUpDiscard bool  `json:"picked_up_discard"`

	RoundScore int `json:"round_score"`
	Score      int `json:"score"`
}

type ThreeThirteenGameState struct {
	Turn   uint64 `json:"turn"`
	Dealer uint64 `json:"dealer"`

	Discard []Card `json:"discard"`
	Round   int    `json:"round"`

	Config ThreeThirteenConfig `json:"config"`

	Started  bool `json:"started"`
	Dealt    bool `json:"dealt"`
	LaidDown int  `json:"laid_down"`
	Finished bool `json:"finished"`
}

type ThreeThirteenStateNotification struct {
	MessageHeader
	ThreeThirteenPlayerState
	ThreeThirteenGameState
}

func (ttsn *ThreeThirteenStateNotification) LoadData(data *GameData, game *ThreeThirteenState, player *PlayerData) {
	ttsn.LoadHeader(data, player)
	ttsn.MessageType = "state"

	if len(game.Players[player.Index].Hand) > 0 {
		ttsn.Hand = game.Players[player.Index].Hand
	}
	ttsn.Drawn = game.Players[player.Index].Drawn
	ttsn.PickedUpDiscard = game.Players[player.Index].PickedUpDiscard

	ttsn.RoundScore = game.Players[player.Index].RoundScore
	ttsn.Score = game.Players[player.Index].Score

	ttsn.Turn, _ = data.ToUserID(game.Turn)
	ttsn.Dealer, _ = data.ToUserID(game.Dealer)

	if len(game.Discard) >= 2 {
		ttsn.Discard = append(ttsn.Discard, *game.Discard[len(game.Discard)-2])
	}
	ttsn.Discard = append(ttsn.Discard, *game.Discard[len(game.Discard)-1])

	ttsn.Config = game.Config

	ttsn.Started = game.Started
	ttsn.Dealt = game.Dealt
	ttsn.LaidDown = game.LaidDown
	ttsn.Finished = game.Finished
}

type ThreeThirteenPlayerSynopsis struct {
	UID     uint64 `json:"user"`
	Playing bool   `json:"playing"`

	IsTurn   bool `json:"is_turn"`
	IsDealer bool `json:"is_dealer"`

	Score int `json:"score"`
}

type ThreeThirteenSynopsisNotification struct {
	MessageHeader

	Players []ThreeThirteenPlayerSynopsis `json:"players"`
	Round   int                           `json:"round"`
}

func (ttsn *ThreeThirteenSynopsisNotification) LoadData(data *GameData, state *ThreeThirteenState, player *PlayerData) {
	ttsn.LoadHeader(data, player)
	ttsn.MessageType = "synopsis"

	ttsn.Round = state.Round

	for _, indexed_player := range data.ToPlayer {
		var synopsis ThreeThirteenPlayerSynopsis
		synopsis.UID = indexed_player.UID
		synopsis.Playing = indexed_player.Playing

		if indexed_player.Index >= 0 {
			synopsis.IsTurn = indexed_player.Index == state.Turn
			synopsis.IsDealer = indexed_player.Index == state.Dealer

			synopsis.Score = state.Players[indexed_player.Index].Score
		}

		ttsn.Players = append(ttsn.Players, synopsis)
	}
}

type ThreeThirteenFinishedNotification struct {
	MessageHeader

	Winner uint64 `json:"winner"`
}

func (ttwn *ThreeThirteenFinishedNotification) LoadFromController(data *GameData, player *PlayerData, winner uint64) {
	ttwn.LoadHeader(data, player)
	ttwn.MessageType = "finished"

	ttwn.Winner = winner
}
