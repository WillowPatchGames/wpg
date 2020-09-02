package games

import (
	"errors"
	"log"
	"strconv"
)

type RushPlayer struct {
	Board LetterGrid   `json:"board"`
	Hand  []LetterTile `json:"hand"`
}

type RushConfig struct {
	NumPlayers     int  `json:"num_players"` // 2 <= n <= 25
	NumTiles       int  `json:"num_tiles"`   // Between 1 and 100 rounds worth
	TilesPerPlayer bool `json:"tiles_per_player"`
	StartSize      int  `json:"start_size"`      // 5 <= n <= 25
	DrawSize       int  `json:"draw_size"`       // 1 <= n <= 10
	DiscardPenalty int  `json:"discard_penalty"` // 1 <= n <= 10
	Frequency      Frequency `json:"frequency"`
}

type RushState struct {
	Tiles   []LetterTile `json:"tiles"`
	DrawID  int          `json:"draw"`
	Players []RushPlayer `json:"players"`
	Config  RushConfig   `json:"config"`
}

func (cfg RushConfig) Validate() error {
	if cfg.NumPlayers <= 1 || cfg.NumPlayers > 25 {
		return GameConfigError{"number of players", strconv.Itoa(cfg.NumPlayers), "between 2 and 25"}
	}

	if cfg.StartSize <= 4 || cfg.StartSize > 25 {
		return GameConfigError{"starting tiles count", strconv.Itoa(cfg.StartSize), "between 5 and 25"}
	}

	if cfg.DrawSize == 0 || cfg.NumPlayers > 10 {
		return GameConfigError{"draw size", strconv.Itoa(cfg.DrawSize), "between 1 and 10"}
	}

	if cfg.DiscardPenalty == 0 || cfg.DiscardPenalty > 10 {
		return GameConfigError{"discard penalty", strconv.Itoa(cfg.DiscardPenalty), "between 1 and 10"}
	}

	var total_tiles int = cfg.NumTiles
	if cfg.TilesPerPlayer {
		total_tiles *= cfg.NumPlayers
	}

	var initial_tiles int = cfg.StartSize * cfg.NumPlayers
	var one_draw int = cfg.DrawSize * cfg.NumPlayers
	var num_rounds = (total_tiles - initial_tiles) / one_draw

	if total_tiles <= (initial_tiles+one_draw) || num_rounds > 75 {
		var tiles_repr string = strconv.Itoa(cfg.NumTiles)
		if cfg.TilesPerPlayer {
			tiles_repr += " per player"
		} else {
			tiles_repr += " total"
		}

		return GameConfigError{"number of tiles", tiles_repr, "enough for 1 to 75 rounds"}
	}

	return nil
}

func (rs *RushState) Init(cfg RushConfig) error {
	var err error

	err = cfg.Validate()
	if err != nil {
		log.Println("Error with RushConfig", err)
		return err
	}

	rs.Config = cfg

	// Create initial player objects
	rs.Players = make([]RushPlayer, rs.Config.NumPlayers)

	// First calculate the number of tiles we need in this game.
	var total_tiles int = rs.Config.NumTiles
	if rs.Config.TilesPerPlayer {
		total_tiles *= rs.Config.NumPlayers
	}

	// Then generate tiles and have players draw their initial tiles.
	rs.Tiles = GenerateTiles(total_tiles, false, BananagramsFreq)
	for player_index := range rs.Players {
		err = rs.DrawTiles(player_index, rs.Config.StartSize)
		if err != nil {
			log.Println("Unexpected error from DrawTiles; shouldn't error during RushState.Init()", err)
			return err
		}
	}

	return nil
}

func (rs *RushState) DrawTiles(player int, count int) error {
	if player >= len(rs.Players) {
		return errors.New("not a valid player identifier")
	}

	if count >= len(rs.Tiles) {
		return errors.New("too few tiles remaining to draw requested number")
	}

	var drawn = rs.Tiles[:count]
	rs.Tiles = rs.Tiles[count:]

	rs.Players[player].Hand = append(rs.Players[player].Hand, drawn...)

	return nil
}

func (rs *RushState) PlayTile(player int, tile_id int, x int, y int) error {
	if player >= len(rs.Players) {
		return errors.New("not a valid player identifier")
	}

	var tile_index int = -1

	for index, tile := range rs.Players[player].Hand {
		if tile.ID == tile_id {
			tile_index = index
			break
		}
	}

	if tile_index == -1 {
		return errors.New("not a valid tile to play")
	}

	// Remote tile from hand
	var tile = rs.Players[player].Hand[tile_index]
	rs.Players[player].Hand = append(rs.Players[player].Hand[:tile_index], rs.Players[player].Hand[tile_index+1:]...)

	// Add to board
	rs.Players[player].Board.Tiles = append(rs.Players[player].Board.Tiles, tile)
	rs.Players[player].Board.ToTile[tile.ID] = tile
	rs.Players[player].Board.PositionsOf[tile.ID] = LetterPos{x, y}
	rs.Players[player].Board.AtPosition[LetterPos{x, y}] = tile.ID

	return nil
}
