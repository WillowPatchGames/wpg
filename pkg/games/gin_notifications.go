package games

type GinPlayerState struct {
	Hand []Card `json:"hand,omitempty"`

	Drawn           *Card `json:"drawn,omitempty"`
	PickedUpDiscard bool  `json:"picked_up_discard"`

	RoundScore int `json:"round_score"`
	Score      int `json:"score"`
}

type GinGameState struct {
	Turn   uint64 `json:"turn"`
	Dealer uint64 `json:"dealer"`

	LaidDown   bool   `json:"laid_down"`
	LaidDownID uint64 `json:"laid_down_id,omitempty"`

	Discard []Card `json:"discard"`

	Config GinConfig `json:"config"`

	Started  bool `json:"started"`
	Dealt    bool `json:"dealt"`
	Finished bool `json:"finished"`
}

type GinStateNotification struct {
	MessageHeader
	GinPlayerState
	GinGameState
}

func (gsn *GinStateNotification) LoadData(data *GameData, game *GinState, player *PlayerData) {
	gsn.LoadHeader(data, player)
	gsn.MessageType = "state"

	if len(game.Players[player.Index].Hand) > 0 {
		gsn.Hand = game.Players[player.Index].Hand
	}
	gsn.Drawn = game.Players[player.Index].Drawn
	gsn.PickedUpDiscard = game.Players[player.Index].PickedUpDiscard

	gsn.RoundScore = game.Players[player.Index].RoundScore
	gsn.Score = game.Players[player.Index].Score

	gsn.Turn, _ = data.ToUserID(game.Turn)
	gsn.Dealer, _ = data.ToUserID(game.Dealer)
	gsn.LaidDown = game.LaidDown != -1
	if gsn.LaidDown {
		gsn.LaidDownID, _ = data.ToUserID(game.LaidDown)
	}

	if len(game.Discard) >= 3 {
		gsn.Discard = append(gsn.Discard, *game.Discard[len(game.Discard)-3])
	}
	if len(game.Discard) >= 2 {
		gsn.Discard = append(gsn.Discard, *game.Discard[len(game.Discard)-2])
	}
	if len(game.Discard) >= 1 {
		gsn.Discard = append(gsn.Discard, *game.Discard[len(game.Discard)-1])
	}

	gsn.Config = game.Config

	gsn.Started = game.Started
	gsn.Dealt = game.Dealt
	gsn.Finished = game.Finished
}

type GinPlayerSynopsis struct {
	UID         uint64 `json:"user"`
	Playing     bool   `json:"playing"`
	PlayerIndex int    `json:"player_index"`

	IsTurn   bool `json:"is_turn"`
	IsDealer bool `json:"is_dealer"`

	Hand []Card `json:"hand,omitempty"`

	RoundScore int `json:"round_score"`
	Score      int `json:"score"`
}

type GinSynopsisNotification struct {
	MessageHeader

	Players []GinPlayerSynopsis `json:"players"`

	Remaining int `json:"remaining"`
	Discarded int `json:"discarded"`
	Round     int `json:"round"`
}

func (gsn *GinSynopsisNotification) LoadData(data *GameData, state *GinState, player *PlayerData) {
	gsn.LoadHeader(data, player)
	gsn.MessageType = "synopsis"

	gsn.Remaining = len(state.Deck.Cards)
	gsn.Discarded = len(state.Discard)

	for _, indexed_player := range data.ToPlayer {
		var synopsis GinPlayerSynopsis
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

		gsn.Players = append(gsn.Players, synopsis)
	}
}

type GinPeekNotification struct {
	MessageHeader

	PlayerMapping []uint64 `json:"player_mapping"`

	// Info for Ended Games (Everyone)
	RoundHistory []*GinRound `json:"round_history"`

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

func (gpn *GinPeekNotification) LoadData(data *GameData, game *GinState, player *PlayerData) {
	gpn.LoadHeader(data, player)
	gpn.MessageType = "game-state"

	for index := range game.Players {
		player_uid, _ := data.ToUserID(index)
		gpn.PlayerMapping = append(gpn.PlayerMapping, player_uid)
	}

	if !game.Finished {
		gpn.Turn, _ = data.ToUserID(game.Turn)
		if game.LaidDown != -1 {
			gpn.LaidDownID, _ = data.ToUserID(game.LaidDown)
		}
		gpn.Dealer, _ = data.ToUserID(game.Dealer)

		if len(game.Discard) >= 3 {
			gpn.Discard = append(gpn.Discard, *game.Discard[len(game.Discard)-3])
		}
		if len(game.Discard) >= 2 {
			gpn.Discard = append(gpn.Discard, *game.Discard[len(game.Discard)-2])
		}
		if len(game.Discard) >= 1 {
			gpn.Discard = append(gpn.Discard, *game.Discard[len(game.Discard)-1])
		}

		if len(game.RoundHistory) > 0 {
			gpn.RoundHistory = game.RoundHistory[:len(game.RoundHistory)-1]
		}
	} else {
		gpn.RoundHistory = game.RoundHistory
	}

	gpn.Started = game.Started
	gpn.Dealt = game.Dealt
	gpn.LaidDown = game.LaidDown != -1
	gpn.Finished = game.Finished

	gpn.Winner, _ = data.ToUserID(game.Winner)
}

type GinFinishedNotification struct {
	MessageHeader

	Winner uint64 `json:"winner"`
}

func (gwn *GinFinishedNotification) LoadData(data *GameData, state *GinState, player *PlayerData) {
	gwn.LoadHeader(data, player)
	gwn.MessageType = "finished"

	gwn.Winner, _ = data.ToUserID(state.Winner)
}
