package games

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

func (ssn *HeartsStateNotification) LoadData(data *GameData, game *HeartsState, player *PlayerData) {
	ssn.LoadHeader(data, player)
	ssn.MessageType = "state"

	ssn.Hand = game.Players[player.Index].Hand
	ssn.HavePassed = game.Players[player.Index].Passed
	if ssn.HavePassed {
		ssn.Incoming = game.Players[player.Index].Incoming
	}

	ssn.Tricks = game.Players[player.Index].Tricks
	ssn.RoundScore = game.Players[player.Index].RoundScore
	ssn.Score = game.Players[player.Index].Score

	ssn.Turn, _ = data.ToUserID(game.Turn)
	ssn.Leader, _ = data.ToUserID(game.Leader)
	ssn.Dealer, _ = data.ToUserID(game.Dealer)

	ssn.PassDirection = game.PassDirection
	ssn.Played = game.Played

	ssn.WhoPlayed = make([]uint64, 0)
	for offset := 0; offset < len(game.Players); offset++ {
		player_index := (game.Leader + offset) % len(game.Players)
		player_uid, _ := data.ToUserID(player_index)
		ssn.WhoPlayed = append(ssn.WhoPlayed, player_uid)
	}

	ssn.HeartsBroken = game.HeartsBroken

	ssn.Crib = game.Crib
	ssn.Config = game.Config

	ssn.Started = game.Started
	ssn.Dealt = game.Dealt
	ssn.Passed = game.Passed
	ssn.Finished = game.Finished

	if len(game.PreviousTricks) >= 1 {
		last_trick := game.PreviousTricks[len(game.PreviousTricks)-1]
		if len(last_trick) >= 1 {
			last_card := last_trick[len(last_trick)-1]
			ssn.History = make([][]Card, 1)
			ssn.History[0] = append(ssn.History[0], last_card)
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
}

func (ssn *HeartsSynopsisNotification) LoadData(data *GameData, state *HeartsState, player *PlayerData) {
	ssn.LoadHeader(data, player)
	ssn.MessageType = "synopsis"

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

		ssn.Players = append(ssn.Players, synopsis)
	}
}

type HeartsBidNotification struct {
	MessageHeader

	Bidder uint64 `json:"bidder"`
	Bidded int    `json:"bidded"`
}

func (sbn *HeartsBidNotification) LoadFromController(data *GameData, player *PlayerData, bidder uint64, value int) {
	sbn.LoadHeader(data, player)
	sbn.MessageType = "bid"

	sbn.Bidder = bidder
	sbn.Bidded = value
}

type HeartsFinishedNotification struct {
	MessageHeader

	Winner uint64 `json:"winner"`
}

func (swn *HeartsFinishedNotification) LoadFromController(data *GameData, player *PlayerData, winner uint64) {
	swn.LoadHeader(data, player)
	swn.MessageType = "finished"

	swn.Winner = winner
}
