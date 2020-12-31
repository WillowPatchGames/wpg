package games

type SpadesPlayerState struct {
	Hand   []Card `json:"hand,omitempty"`
	Drawn  *Card  `json:"drawn,omitempty"`
	Peeked bool   `json:"peeked"`

	Bid SpadesBid `json:"bid"`

	Tricks    int `json:"tricks"`
	Score     int `json:"score"`
	Overtakes int `json:"overtakes"`
}

type SpadesGameState struct {
	Turn   uint64 `json:"turn"`
	Leader uint64 `json:"leader"`
	Dealer uint64 `json:"dealer"`

	Played       []Card `json:"played"`
	SpadesBroken bool   `json:"spades_broken"`

	Config SpadesConfig `json:"config"`

	Started  bool `json:"started"`
	Dealt    bool `json:"dealt"`
	Bidded   bool `json:"bidded"`
	Finished bool `json:"finished"`
}

type SpadesStateNotification struct {
	MessageHeader
	SpadesPlayerState
	SpadesGameState
}

func (ssn *SpadesStateNotification) LoadData(data *GameData, game *SpadesState, player *PlayerData) {
	ssn.LoadHeader(data, player)
	ssn.MessageType = "state"

	ssn.Drawn = game.Players[player.Index].Drawn
	ssn.Peeked = game.Players[player.Index].Peeked
	if ssn.Peeked && len(game.Players[player.Index].Hand) > 0 {
		ssn.Hand = game.Players[player.Index].Hand
	}

	ssn.Bid = game.Players[player.Index].Bid

	ssn.Tricks = game.Players[player.Index].Tricks
	ssn.Score = game.Players[player.Index].Score
	ssn.Overtakes = game.Players[player.Index].Overtakes

	// XXX Map these correctly
	ssn.Turn, _ = data.ToUserID(game.Turn)
	ssn.Leader, _ = data.ToUserID(game.Leader)
	ssn.Dealer, _ = data.ToUserID(game.Dealer)

	ssn.Played = game.Played
	ssn.SpadesBroken = game.SpadesBroken

	ssn.Config = game.Config

	ssn.Started = game.Started
	ssn.Dealt = game.Dealt
	ssn.Bidded = game.Bid
	ssn.Finished = game.Finished
}

type SpadesPlayerSynopsis struct {
	UID     uint64 `json:"user"`
	Playing bool   `json:"playing"`

	IsTurn   bool `json:"is_turn"`
	IsLeader bool `json:"is_leader"`
	IsDealer bool `json:"is_dealer"`

	Bid       int `json:"bid"`
	Tricks    int `json:"tricks"`
	Score     int `json:"score"`
	Overtakes int `json:"overtakes"`
}

type SpadesSynopsisNotification struct {
	MessageHeader

	Players []SpadesPlayerSynopsis `json:"players"`
}

func (ssn *SpadesSynopsisNotification) LoadData(data *GameData, state *SpadesState, player *PlayerData) {
	ssn.LoadHeader(data, player)
	ssn.MessageType = "synopsis"

	for _, indexed_player := range data.ToPlayer {
		var synopsis SpadesPlayerSynopsis
		synopsis.UID = indexed_player.UID
		synopsis.Playing = indexed_player.Playing

		if indexed_player.Index >= 0 {
			synopsis.IsTurn = indexed_player.Index == state.Turn
			synopsis.IsLeader = indexed_player.Index == state.Leader
			synopsis.IsDealer = indexed_player.Index == state.Dealer

			synopsis.Bid = int(state.Players[indexed_player.Index].Bid)
			synopsis.Tricks = state.Players[indexed_player.Index].Tricks
			synopsis.Score = state.Players[indexed_player.Index].Score
			synopsis.Overtakes = state.Players[indexed_player.Index].Overtakes
		}

		ssn.Players = append(ssn.Players, synopsis)
	}
}

type SpadesBidNotification struct {
	MessageHeader

	Bidder uint64 `json:"bidder"`
	Bidded int    `json:"bidded"`
}

func (sbn *SpadesBidNotification) LoadFromController(data *GameData, player *PlayerData, bidder uint64, value int) {
	sbn.LoadHeader(data, player)
	sbn.MessageType = "bid"

	sbn.Bidder = bidder
	sbn.Bidded = value
}

type SpadesFinishedNotification struct {
	MessageHeader

	Winner uint64 `json:"winner"`
}

func (swn *SpadesFinishedNotification) LoadFromController(data *GameData, player *PlayerData, winner uint64) {
	swn.LoadHeader(data, player)
	swn.MessageType = "finished"

	swn.Winner = winner
}
