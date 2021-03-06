package games

import (
	"errors"
	"log"
	"strconv"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/utils"

	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/figgy"
)

const RushYouWon string = "game is over; you won"

type RushPlayer struct {
	Board LetterGrid   `json:"board"`
	Hand  []LetterTile `json:"hand"`

	// The following fields are temporary and aren't persisted to the database
	// because, if the game were to restart, all data here is already present in
	// hand or board. When a client reconnects, they'll start with all data in
	// `board` or `hand` and won't need any of the data here.
	NewTiles []LetterTile `json:"-"`
}

func (rp *RushPlayer) Init() {
	rp.Board.Init()
	rp.Hand = make([]LetterTile, 0)
	rp.NewTiles = make([]LetterTile, 0)
}

func (rp *RushPlayer) FindTile(tileID int) (int, bool) {
	for index, tile := range rp.Hand {
		if tile.ID == tileID {
			return index, true
		}
	}

	return -1, false
}

type RushConfig struct {
	NumPlayers int `json:"num_players" config:"type:int,min:2,default:4,max:50" label:"Number of players"` // Best with two to four or six.
	NumTiles   int `json:"num_tiles" config:"type:int,min:10,default:75,max:300" label:"Number of tiles"`  // Between 1 and 200 rounds worth.

	TilesPerPlayer bool      `json:"tiles_per_player" config:"type:bool,default:false" label:"true:Tiles per Player,false:Total number of tiles"`
	Frequency      Frequency `json:"frequency" config:"type:enum,default:1,options:1:Standard US English Letter Frequencies;2:Bananagrams Tile Frequency;3:Scrabble Tile Frequency" label:"Tile frequency"`

	StartSize      int `json:"start_size" config:"type:int,min:7,default:12,max:25" label:"Player tile start size"`
	DrawSize       int `json:"draw_size" config:"type:int,min:1,default:1,max:10" label:"Player tile draw size"`
	DiscardPenalty int `json:"discard_penalty" config:"type:int,min:1,default:3,max:5" label:"Player tile discard penalty"`
}

func (cfg RushConfig) Validate() error {
	if cfg.Frequency <= StartFreqRange || cfg.Frequency >= EndFreqRange {
		return GameConfigError{"frequency range", strconv.Itoa(int(cfg.Frequency)), "between " + strconv.Itoa(int(StartFreqRange)) + " and " + strconv.Itoa(int(EndFreqRange))}
	}

	var totalTiles int = cfg.NumTiles
	if cfg.TilesPerPlayer {
		totalTiles *= cfg.NumPlayers
	}

	var initialTiles int = cfg.StartSize * cfg.NumPlayers
	var oneDraw int = cfg.DrawSize * cfg.NumPlayers
	var numRounds = (totalTiles - initialTiles) / oneDraw

	if totalTiles < (initialTiles+oneDraw) || numRounds > 200 {
		var tilesRepr string = strconv.Itoa(cfg.NumTiles)
		if cfg.TilesPerPlayer {
			tilesRepr += " per player"
		} else {
			tilesRepr += " total"
		}

		return GameConfigError{"number of tiles", tilesRepr, "must be enough for 1 to 200 rounds of drawing"}
	}

	return nil
}

type RushState struct {
	Tiles    []LetterTile `json:"tiles"`
	DrawID   int          `json:"draw"`
	Players  []RushPlayer `json:"players"`
	Config   RushConfig   `json:"config"`
	Started  bool         `json:"started"`
	Finished bool         `json:"finished"`
	Winner   int          `json:"winner"`
}

func (rs *RushState) Init(cfg RushConfig) error {
	var err error = figgy.Validate(cfg)
	if err != nil {
		log.Println("Error with RushConfig", err)
		return err
	}

	rs.Config = cfg
	rs.Started = false
	rs.Finished = false
	rs.Winner = -1

	return nil
}

func (rs *RushState) GetConfiguration() figgy.Figgurable {
	return rs.Config
}

func (rs *RushState) ReInit() error {
	for _, player := range rs.Players {
		player.NewTiles = make([]LetterTile, 0)
		player.Board.ReInit()
	}

	return nil
}

func (rs *RushState) IsStarted() bool {
	return rs.Started
}

func (rs *RushState) IsFinished() bool {
	return rs.Finished
}

func (rs *RushState) ResetStatus() {
	rs.Started = false
	rs.Finished = false
}

func (rs *RushState) Start(players int) error {
	var err error

	if rs.Started {
		log.Println("Error! Double start occurred...", err)
		return errors.New("double start occurred")
	}

	rs.Config.NumPlayers = players

	err = figgy.Validate(rs.Config)
	if err != nil {
		log.Println("Error with RushConfig after starting", err)
		return err
	}

	// Create the player objects
	rs.Players = make([]RushPlayer, rs.Config.NumPlayers)

	// First calculate the number of tiles we need in this game.
	var totalTiles int = rs.Config.NumTiles
	if rs.Config.TilesPerPlayer {
		totalTiles *= rs.Config.NumPlayers
	}

	// Then generate tiles and have players draw their initial tiles.
	rs.Tiles = GenerateTiles(totalTiles, false, rs.Config.Frequency)
	for playerIndex := range rs.Players {
		rs.Players[playerIndex].Init()

		err = rs.drawTiles(playerIndex, rs.Config.StartSize)
		if err != nil {
			log.Println("Unexpected error from DrawTiles; shouldn't error during RushState.Init()", err)
			return err
		}
	}

	// Increment to the initial draw identifier value of 1 to show players they
	// need to draw. (Initial DrawID on the client side is 0; this forces them
	// to load their hands).
	rs.DrawID = 1
	rs.Started = true

	return nil
}

func (rs *RushState) HasValidWords(player int) error {
	if !rs.Started {
		return errors.New("game hasn't started yet")
	}

	if player < 0 || player >= len(rs.Players) {
		return errors.New("not a valid player identifier: " + strconv.Itoa(player))
	}

	return rs.Players[player].Board.VisitAllWordsOnBoard(func(lg *LetterGrid, start LetterPos, end LetterPos, word string) error {
		if !IsWord(word) {
			return errors.New("not a valid word: " + word)
		}

		return nil
	})
}

func (rs *RushState) IsValidBoard(player int) error {
	if !rs.Started {
		return errors.New("game hasn't started yet")
	}

	if player < 0 || player >= len(rs.Players) {
		return errors.New("not a valid player identifier: " + strconv.Itoa(player))
	}

	// To be a valid board we need:
	// - to have at least two tiles on the board, and
	// - to have a single connected component over all letters, and
	// - for all top->down and left->right segments to be valid words.

	if len(rs.Players[player].Board.Tiles) <= 1 {
		return errors.New("expected more than one tile on the board")
	}

	if !rs.Players[player].Board.IsAllConnected() {
		return errors.New("expected board to be a single connected component")
	}

	if err := rs.HasValidWords(player); err != nil {
		return err
	}

	return nil
}

func (rs *RushState) drawTiles(player int, count int) error {
	if player < 0 || player >= len(rs.Players) {
		return errors.New("not a valid player identifier: " + strconv.Itoa(player))
	}

	if count > len(rs.Tiles) {
		rs.Finished = true
		return errors.New("too few tiles remaining to draw requested number")
	}

	var drawn = rs.Tiles[:count]
	rs.Tiles = rs.Tiles[count:]

	rs.Players[player].Hand = append(rs.Players[player].Hand, drawn...)
	rs.Players[player].NewTiles = append(rs.Players[player].NewTiles, drawn...)

	return nil
}

func (rs *RushState) PlayTile(player int, tileID int, x int, y int) error {
	if !rs.Started {
		return errors.New("game hasn't started yet")
	}

	if rs.Finished {
		return errors.New("game has already finished")
	}

	if player < 0 || player >= len(rs.Players) {
		return errors.New("not a valid player identifier: " + strconv.Itoa(player))
	}

	var tileIndex int
	var ok bool
	tileIndex, ok = rs.Players[player].FindTile(tileID)
	if !ok {
		return errors.New("tile is not in hand")
	}

	// Check if destination is occupied; if so, issue a SwapTile request rather
	// than a PlayTile request.
	if boardTileID, ok := rs.Players[player].Board.AtPosition[LetterPos{x, y}]; ok {
		return rs.SwapTile(player, tileID, boardTileID)
	}

	// Remote tile from hand
	var tile = rs.Players[player].Hand[tileIndex]
	rs.Players[player].Hand = append(rs.Players[player].Hand[:tileIndex], rs.Players[player].Hand[tileIndex+1:]...)

	// Add to board
	rs.Players[player].Board.AddTile(tile, x, y)

	return nil
}

func (rs *RushState) MoveTile(player int, tileID int, x int, y int) error {
	if !rs.Started {
		return errors.New("game hasn't started yet")
	}

	if rs.Finished {
		return errors.New("game has already finished")
	}

	if player < 0 || player >= len(rs.Players) {
		return errors.New("not a valid player identifier: " + strconv.Itoa(player))
	}

	if _, ok := rs.Players[player].Board.ToTile[tileID]; !ok {
		return errors.New("not a valid tile identifier: " + strconv.Itoa(tileID))
	}

	// Move the tile on the board
	rs.Players[player].Board.MoveTile(tileID, x, y)

	return nil
}

func (rs *RushState) swapTilesOnBoard(player int, first int, second int) error {
	if _, ok := rs.Players[player].Board.ToTile[first]; !ok {
		return errors.New("first is not a valid tile identifier")
	}

	if _, ok := rs.Players[player].Board.ToTile[second]; !ok {
		return errors.New("second is not a valid tile identifier")
	}

	// Swap the tiles on the board
	rs.Players[player].Board.SwapTile(first, second)

	return nil
}

func (rs *RushState) swapTileHandToBoard(player int, handTile int, boardTile int) error {
	// boardTile is a Tile ID
	// handTile is an index in Hand

	// Grab the tile from the board and place it in the hand
	var tile = rs.Players[player].Board.ToTile[boardTile]
	var pos = rs.Players[player].Board.PositionsOf[boardTile]
	rs.Players[player].Board.RemoveTile(boardTile)

	rs.Players[player].Hand = append(rs.Players[player].Hand, tile)

	// Grab the tile from the hand and place it on the board
	tile = rs.Players[player].Hand[handTile]
	rs.Players[player].Hand = append(rs.Players[player].Hand[:handTile], rs.Players[player].Hand[handTile+1:]...)
	rs.Players[player].Board.AddTile(tile, pos.X, pos.Y)

	return nil
}

func (rs *RushState) SwapTile(player int, first int, second int) error {
	if !rs.Started {
		return errors.New("game hasn't started yet")
	}

	if rs.Finished {
		return errors.New("game has already finished")
	}

	if player < 0 || player >= len(rs.Players) {
		return errors.New("not a valid player identifier: " + strconv.Itoa(player))
	}

	var firstIndex int
	var firstOk bool
	firstIndex, firstOk = rs.Players[player].FindTile(first)

	var secondIndex int
	var secondOk bool
	secondIndex, secondOk = rs.Players[player].FindTile(second)

	if firstOk && secondOk {
		// Since the order of the hand is an implementation detail, we can safely
		// make this a no-op.
		return nil
	} else if firstOk {
		return rs.swapTileHandToBoard(player, firstIndex, second)
	} else if secondOk {
		return rs.swapTileHandToBoard(player, secondIndex, first)
	}

	return rs.swapTilesOnBoard(player, first, second)
}

func (rs *RushState) RecallTile(player int, tileID int) error {
	if !rs.Started {
		return errors.New("game hasn't started yet")
	}

	if rs.Finished {
		return errors.New("game has already finished")
	}

	if player < 0 || player >= len(rs.Players) {
		return errors.New("not a valid player identifier: " + strconv.Itoa(player))
	}

	var tile LetterTile
	var ok bool
	if tile, ok = rs.Players[player].Board.ToTile[tileID]; !ok {
		return errors.New("not a valid tile identifier on the board")
	}

	rs.Players[player].Board.RemoveTile(tile.ID)
	rs.Players[player].Hand = append(rs.Players[player].Hand, tile)

	return nil
}

func (rs *RushState) Discard(player int, tileID int) error {
	if !rs.Started {
		return errors.New("game hasn't started yet")
	}

	if rs.Finished {
		return errors.New("game has already finished")
	}

	if player < 0 || player >= len(rs.Players) {
		return errors.New("not a valid player identifier: " + strconv.Itoa(player))
	}

	if rs.Config.DiscardPenalty > len(rs.Tiles) {
		return errors.New("unable to draw; not enough tiles remaining")
	}

	// It is safe to ignore this error: we first recall the tile from the board
	// if it was there. Then we can discard it out of the hand and re-add it.
	_ = rs.RecallTile(player, tileID)

	var tileIndex int
	var found bool
	if tileIndex, found = rs.Players[player].FindTile(tileID); !found {
		return errors.New("unable to find tile in hand")
	}

	// Save existing tile and remove from hand
	var tile LetterTile = rs.Players[player].Hand[tileIndex]
	rs.Players[player].Hand = append(rs.Players[player].Hand[:tileIndex], rs.Players[player].Hand[tileIndex+1:]...)

	// Draw new tiles before re-adding tile from hand.
	err := rs.drawTiles(player, rs.Config.DiscardPenalty)
	if err != nil {
		// Re-add tile to hand before existing since an error occurred and we
		// couldn't actually discard it.
		rs.Players[player].Hand = append(rs.Players[player].Hand, tile)
		return err
	}

	// Only put the tile back after we discard, so we don't get it back
	// accidentally.
	rs.Tiles = append(rs.Tiles, tile)

	// After putting the tile back in the pool, shuffle it so that another player
	// has a shot at drawing this tile. Otherwise, just putting it at the end
	// isn't a good idea as nobody might get it again.
	utils.SecureRand.Shuffle(len(rs.Tiles), func(i, j int) {
		rs.Tiles[i], rs.Tiles[j] = rs.Tiles[j], rs.Tiles[i]
	})

	return nil
}

func (rs *RushState) Draw(player int, lastID int) error {
	if !rs.Started {
		return errors.New("game hasn't started yet")
	}

	if rs.Finished {
		return errors.New("game has already finished")
	}

	if player < 0 || player >= len(rs.Players) {
		return errors.New("not a valid player identifier: " + strconv.Itoa(player))
	}

	if len(rs.Players[player].Hand) > 0 {
		return errors.New("unable to draw while tiles remain in the hand")
	}

	if rs.DrawID > lastID {
		return errors.New("unable to draw with old draw id")
	}

	if err := rs.IsValidBoard(player); err != nil {
		return errors.New("unable to draw because of invalid board: " + err.Error())
	}

	var tilesNeeded = rs.Config.DrawSize * rs.Config.NumPlayers
	if tilesNeeded > len(rs.Tiles) {
		rs.Finished = true
		rs.Winner = player
		return errors.New(RushYouWon)
	}

	// Draw for all players
	rs.DrawID++
	for playerIndex := range rs.Players {
		if err := rs.drawTiles(playerIndex, rs.Config.DrawSize); err != nil {
			return err
		}
	}

	return nil
}
