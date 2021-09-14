package games

type EightJacksPlayerState struct {
	UID   uint64 `json:"user_id"`
	Index int    `json:"player_index"`

	Hand     []Card `json:"hand"`
	History  []Card `json:"history"`
	Discards []Card `json:"discards"`

	SelectedSquare int `json:"selected_square"`

	Team  int     `json:"team"`
	Runs  [][]int `json:"runs"`
	Score int     `json:"score"`
}

type EightJacksOtherPlayerState struct {
	UID   uint64 `json:"user_id"`
	Index int    `json:"player_index"`

	History  []Card `json:"history"`
	Discards []Card `json:"discards"`

	Team  int     `json:"team"`
	Runs  [][]int `json:"runs"`
	Score int     `json:"score"`
}

type EightJacksGameState struct {
	Turn   uint64 `json:"turn"`
	Dealer uint64 `json:"dealer"`

	Board  EightJacksBoard  `json:"board"`
	Config EightJacksConfig `json:"config"`

	GlobalHistory []Card `json:"global_history"`

	Assigned bool `json:"assigned"`
	Started  bool `json:"started"`
	Dealt    bool `json:"dealt"`
	Finished bool `json:"finished"`

	Winners []uint64 `json:"winners,omitempty"`
}

type EightJacksStateNotification struct {
	MessageHeader
	EightJacksPlayerState
	EightJacksGameState
	Players []EightJacksOtherPlayerState `json:"players"`
}

func (ejsn *EightJacksStateNotification) LoadData(data *GameData, game *EightJacksState, player *PlayerData) {
	ejsn.LoadHeader(data, player)
	ejsn.MessageType = "state"

	ejsn.UID = player.UID
	ejsn.Index = player.Index

	ejsn.Hand = game.Players[player.Index].Hand
	ejsn.History = game.Players[player.Index].History
	ejsn.Discards = game.Players[player.Index].Discards

	ejsn.SelectedSquare = game.Players[player.Index].SelectedSquare

	ejsn.Team = game.Players[player.Index].Team
	ejsn.Runs = game.Players[player.Index].Runs
	ejsn.Score = len(game.Players[player.Index].Runs)

	ejsn.Turn, _ = data.ToUserID(game.Turn)
	ejsn.Dealer, _ = data.ToUserID(game.Dealer)

	ejsn.Board = game.Board
	ejsn.Config = game.Config
	ejsn.GlobalHistory = game.GlobalHistory

	ejsn.Assigned = game.Assigned
	ejsn.Started = game.Started
	ejsn.Dealt = game.Dealt
	ejsn.Finished = game.Finished
	if game.Finished {
		ejsn.Winners, _ = data.ToUserIDs(game.Winners)
	}

	for _, indexed_player := range data.ToPlayer {
		if indexed_player.Index == -1 {
			continue
		}

		var overview EightJacksOtherPlayerState
		overview.UID = indexed_player.UID
		overview.Index = indexed_player.Index

		overview.History = game.Players[indexed_player.Index].History
		overview.Discards = game.Players[indexed_player.Index].Discards

		overview.Team = game.Players[indexed_player.Index].Team
		overview.Runs = game.Players[indexed_player.Index].Runs
		overview.Score = len(game.Players[indexed_player.Index].Runs)

		ejsn.Players = append(ejsn.Players, overview)
	}
}

type EightJacksPlayerSynopsis struct {
	UID         uint64 `json:"user"`
	Playing     bool   `json:"playing"`
	PlayerIndex int    `json:"player_index"`

	IsTurn   bool `json:"is_turn"`
	IsDealer bool `json:"is_dealer"`

	Team int `json:"team"`

	Score int `json:"score"`
}

type EightJacksSynopsisNotification struct {
	MessageHeader

	Players []EightJacksPlayerSynopsis `json:"players"`
}

func (ejsn *EightJacksSynopsisNotification) LoadData(data *GameData, state *EightJacksState, player *PlayerData) {
	ejsn.LoadHeader(data, player)
	ejsn.MessageType = "synopsis"

	for _, indexed_player := range data.ToPlayer {
		var synopsis EightJacksPlayerSynopsis
		synopsis.UID = indexed_player.UID
		synopsis.Playing = indexed_player.Playing
		synopsis.PlayerIndex = indexed_player.Index

		if indexed_player.Index >= 0 {
			synopsis.IsTurn = indexed_player.Index == state.Turn
			synopsis.IsDealer = indexed_player.Index == state.Dealer

			synopsis.Team = state.Players[indexed_player.Index].Team

			synopsis.Score = len(state.Players[indexed_player.Index].Runs)
		}

		ejsn.Players = append(ejsn.Players, synopsis)
	}
}

type EightJacksPeekNotification struct {
	MessageHeader
	EightJacksGameState

	Players []EightJacksOtherPlayerState `json:"players"`
	Winners []uint64                     `json:"winners"`

	Turns []EightJacksTurn `json:"turns,omitempty"`
}

func (ejsn *EightJacksPeekNotification) LoadData(data *GameData, game *EightJacksState, player *PlayerData) {
	ejsn.LoadHeader(data, player)
	ejsn.MessageType = "game-state"

	ejsn.Turn, _ = data.ToUserID(game.Turn)
	ejsn.Dealer, _ = data.ToUserID(game.Dealer)

	ejsn.Board = game.Board
	ejsn.Config = game.Config
	ejsn.GlobalHistory = game.GlobalHistory

	ejsn.Assigned = game.Assigned
	ejsn.Started = game.Started
	ejsn.Dealt = game.Dealt
	ejsn.Finished = game.Finished

	ejsn.Winners, _ = data.ToUserIDs(game.Winners)

	for _, indexed_player := range data.ToPlayer {
		if indexed_player.Index == -1 {
			continue
		}

		var overview EightJacksOtherPlayerState
		overview.UID = indexed_player.UID
		overview.Index = indexed_player.Index

		overview.History = game.Players[indexed_player.Index].History
		overview.Discards = game.Players[indexed_player.Index].Discards

		overview.Team = game.Players[indexed_player.Index].Team
		overview.Runs = game.Players[indexed_player.Index].Runs
		overview.Score = len(game.Players[indexed_player.Index].Runs)

		ejsn.Players = append(ejsn.Players, overview)
	}

	// Unlike EightJacksOtherPlayerState, this contains sensitive information
	// (the contents of a player's hand) -- so don't display this until we're
	// done with the game.
	if game.Finished {
		ejsn.Turns = game.TurnHistory
	}
}

type EightJacksFinishedNotification struct {
	MessageHeader

	Winners []uint64 `json:"winners"`
}

func (ejwn *EightJacksFinishedNotification) LoadData(data *GameData, state *EightJacksState, player *PlayerData) {
	ejwn.LoadHeader(data, player)
	ejwn.MessageType = "finished"

	ejwn.Winners, _ = data.ToUserIDs(state.Winners)
}
