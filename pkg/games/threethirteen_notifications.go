package games

type ThreeThirteenPlayerState struct {
	Hand     []Card  `json:"hand,omitempty"`
	Groups   [][]int `json:"groups,omitempty"`
	Leftover []int   `json:"leftover,omitempty"`

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

	ttsn.Hand = game.Players[player.Index].Hand
	ttsn.Groups = game.Players[player.Index].Groups
	ttsn.Leftover = game.Players[player.Index].Leftover
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

	if len(game.Discard) >= 3 {
		ttsn.Discard = append(ttsn.Discard, *game.Discard[len(game.Discard)-3])
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

	Hand     []Card  `json:"hand,omitempty"`
	Groups   [][]int `json:"groups,omitempty"`
	Leftover []int   `json:"leftover,omitempty"`

	RoundScore int `json:"round_score"`
	Score      int `json:"score"`
}

type ThreeThirteenSynopsisNotification struct {
	MessageHeader

	Players []ThreeThirteenPlayerSynopsis `json:"players"`

	Remaining int `json:"remaining"`
	Discarded int `json:"discarded"`
	Round     int `json:"round"`
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
				synopsis.Groups = state.Players[indexed_player.Index].Groups
				synopsis.Leftover = state.Players[indexed_player.Index].Leftover
			}
		}

		ttsn.Players = append(ttsn.Players, synopsis)
	}
}

type ThreeThirteenPeekNotification struct {
	MessageHeader

	PlayerMapping []uint64 `json:"player_mapping"`

	// Info for Ended Games (Everyone)
	RoundHistory []*ThreeThirteenRound `json:"round_history"`

	// Info for Active Games (Spectators)
	Turn       uint64 `json:"turn"`
	LaidDownID uint64 `json:"laid_down_id"`
	Dealer     uint64 `json:"dealer"`

	Discard []Card `json:"discard,omitempty"`

	Started  bool `json:"started"`
	Dealt    bool `json:"dealt"`
	LaidDown bool `json:"laid_down"`
	Finished bool `json:"finished"`

	Winner uint64 `json:"winner"`
}

func (ttpn *ThreeThirteenPeekNotification) LoadData(data *GameData, game *ThreeThirteenState, player *PlayerData) {
	ttpn.LoadHeader(data, player)
	ttpn.MessageType = "game-state"

	for index := range game.Players {
		player_uid, _ := data.ToUserID(index)
		ttpn.PlayerMapping = append(ttpn.PlayerMapping, player_uid)
	}

	if !game.Finished {
		ttpn.Turn, _ = data.ToUserID(game.Turn)
		if game.LaidDown != -1 {
			ttpn.LaidDownID, _ = data.ToUserID(game.LaidDown)
		}
		ttpn.Dealer, _ = data.ToUserID(game.Dealer)

		if len(game.Discard) >= 3 {
			ttpn.Discard = append(ttpn.Discard, *game.Discard[len(game.Discard)-3])
		}
		if len(game.Discard) >= 2 {
			ttpn.Discard = append(ttpn.Discard, *game.Discard[len(game.Discard)-2])
		}
		if len(game.Discard) >= 1 {
			ttpn.Discard = append(ttpn.Discard, *game.Discard[len(game.Discard)-1])
		}

		if len(game.RoundHistory) > 0 {
			ttpn.RoundHistory = game.RoundHistory[:len(game.RoundHistory)-1]
		}
	} else {
		ttpn.RoundHistory = game.RoundHistory
	}

	ttpn.Started = game.Started
	ttpn.Dealt = game.Dealt
	ttpn.LaidDown = game.LaidDown != -1
	ttpn.Finished = game.Finished

	ttpn.Winner, _ = data.ToUserID(game.Winner)
}

type ThreeThirteenFinishedNotification struct {
	MessageHeader

	Winner uint64 `json:"winner"`
}

func (ttwn *ThreeThirteenFinishedNotification) LoadData(data *GameData, state *ThreeThirteenState, player *PlayerData) {
	ttwn.LoadHeader(data, player)
	ttwn.MessageType = "finished"

	ttwn.Winner, _ = data.ToUserID(state.Winner)
}
