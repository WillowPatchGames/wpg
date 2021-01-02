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

	LaidDown   bool   `json:"laid_down"`
	LaidDownID uint64 `json:"laid_down_id,omitempty"`

	Discard []Card `json:"discard"`
	Round   int    `json:"round"`

	Config ThreeThirteenConfig `json:"config"`

	Started  bool `json:"started"`
	Dealt    bool `json:"dealt"`
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
	ttsn.LaidDown = game.LaidDown != -1
	if ttsn.LaidDown {
		ttsn.LaidDownID, _ = data.ToUserID(game.LaidDown)
	}

	if len(game.Discard) >= 2 {
		ttsn.Discard = append(ttsn.Discard, *game.Discard[len(game.Discard)-2])
	}
	if len(game.Discard) >= 1 {
		ttsn.Discard = append(ttsn.Discard, *game.Discard[len(game.Discard)-1])
	}

	ttsn.Round = game.Round

	ttsn.Config = game.Config

	ttsn.Started = game.Started
	ttsn.Dealt = game.Dealt
	ttsn.Finished = game.Finished
}

type ThreeThirteenPlayerSynopsis struct {
	UID         uint64 `json:"user"`
	Playing     bool   `json:"playing"`
	PlayerIndex int    `json:"player_index"`

	IsTurn   bool `json:"is_turn"`
	IsDealer bool `json:"is_dealer"`

	Hand []Card `json:"hand,omitempty"`

	RoundScore int `json:"round_score"`
	Score      int `json:"score"`
}

type ThreeThirteenSynopsisNotification struct {
	MessageHeader

	Players []ThreeThirteenPlayerSynopsis `json:"players"`

	Remaining int `json:"remaining"`
	Discarded int `json:"discarded"`
	Round   int                           `json:"round"`
}

func (ttsn *ThreeThirteenSynopsisNotification) LoadData(data *GameData, state *ThreeThirteenState, player *PlayerData) {
	ttsn.LoadHeader(data, player)
	ttsn.MessageType = "synopsis"

	ttsn.Remaining = len(state.Deck.Cards)
	ttsn.Discarded = len(state.Discard)

	ttsn.Round = state.Round

	for _, indexed_player := range data.ToPlayer {
		var synopsis ThreeThirteenPlayerSynopsis
		synopsis.UID = indexed_player.UID
		synopsis.Playing = indexed_player.Playing
		synopsis.PlayerIndex = indexed_player.Index

		if indexed_player.Index != -1 {
			synopsis.IsTurn = indexed_player.Index == state.Turn
			synopsis.IsDealer = indexed_player.Index == state.Dealer

			synopsis.RoundScore = state.Players[indexed_player.Index].RoundScore
			synopsis.Score = state.Players[indexed_player.Index].Score

			if (!state.Dealt || state.LaidDown != -1) && len(state.Players[indexed_player.Index].Hand) > 0 && state.Players[indexed_player.Index].Drawn == nil {
				synopsis.Hand = state.Players[indexed_player.Index].Hand
			}
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
