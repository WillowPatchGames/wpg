package games

type RushPlayerState struct {
	Board   LetterGrid   `json:"board,omitempty"`
	Hand    []LetterTile `json:"hand,omitempty"`
	Unwords []string     `json:"unwords,omitempty"`
}

type RushGameState struct {
	DrawID   int        `json:"draw_id"`
	Config   RushConfig `json:"config"`
	Started  bool       `json:"started"`
	Finished bool       `json:"finished"`
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
	rsn.Started = game.Started
	rsn.Finished = game.Finished

	if len(game.Players[player].NewTiles) > 0 {
		rsn.Added = new(RushPlayerState)
		rsn.Added.Hand = game.Players[player].NewTiles
	}
	game.Players[player].NewTiles = make([]LetterTile, 0)
}

func (rsn *RushStateNotification) LoadFromController(data *GameData, player *PlayerData) {
	rsn.LoadHeader(data, player)
	rsn.MessageType = "state"
}

type RushPlayerSynopsis struct {
	UID     uint64 `json:"user"`
	Playing bool   `json:"playing"`
	OnBoard int    `json:"on_board"`
	InHand  int    `json:"in_hand"`
}

type RushSynopsisNotification struct {
	MessageHeader

	Players        []RushPlayerSynopsis `json:"players"`
	RemainingTiles int                  `json:"remaining"`
}

func (rsn *RushSynopsisNotification) LoadData(data *GameData, state *RushState, player *PlayerData) {
	rsn.LoadHeader(data, player)
	rsn.MessageType = "synopsis"

	rsn.RemainingTiles = len(state.Tiles)

	for _, indexed_player := range data.ToPlayer {
		var synopsis RushPlayerSynopsis
		synopsis.UID = indexed_player.UID
		synopsis.Playing = indexed_player.Playing

		if indexed_player.Index >= 0 {
			synopsis.OnBoard = len(state.Players[indexed_player.Index].Board.Tiles)
			synopsis.InHand = len(state.Players[indexed_player.Index].Hand)
		}

		rsn.Players = append(rsn.Players, synopsis)
	}
}

type RushDrawNotification struct {
	MessageHeader

	Drawer uint64 `json:"drawer"`
}

func (rdn *RushDrawNotification) LoadFromController(data *GameData, player *PlayerData, drawer uint64) {
	rdn.LoadHeader(data, player)
	rdn.MessageType = "draw"

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
	rcn.LoadHeader(data, player)
	rcn.MessageType = "checked"

	if err != nil {
		rcn.Error = err.Error()
	}
}

type RushFinishedNotification struct {
	MessageHeader

	Winner uint64 `json:"winner"`
}

func (rwn *RushFinishedNotification) LoadData(data *GameData, state *RushState, player *PlayerData) {
	rwn.LoadHeader(data, player)
	rwn.MessageType = "finished"

	rwn.Winner, _ = data.ToUserID(state.Winner)
}

type RushGameStateNotification struct {
	MessageHeader
	RushGameState

	Players   []RushPlayerState `json:"player_data"`
	PlayerMap map[int]uint64    `json:"player_map"`
	Winner    uint64            `json:"winner,omitempty"`

	// Used to map winner from internal state index to external UID
	winner int
}

func (rgsn *RushGameStateNotification) LoadFromGame(game *RushState) {
	rgsn.DrawID = game.DrawID
	rgsn.Config = game.Config
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
	rgsn.LoadHeader(data, player)
	rgsn.MessageType = "game-state"

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
