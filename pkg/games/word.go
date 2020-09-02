package games

import (
	"encoding/json"
)

type LetterTile struct {
	ID      int    `json:"id"`
	Display string `json:"display,omitempty"`
	Value   string `json:"value"`
}

type LetterPos struct {
	X int `json:"x"`
	Y int `json:"y"`
}

type LetterGrid struct {
	Tiles       []LetterTile `json:"tiles"`
	ToTile      map[int]LetterTile
	PositionsOf map[int]LetterPos `json:"positions"`
	AtPosition  map[LetterPos]int
}

func (lg *LetterGrid) FromJSON(data []byte) error {
	err := json.Unmarshal(data, lg)
	if err != nil {
		return err
	}

	lg.inverseMap()
	lg.letterMap()
	return nil
}

func (lg *LetterGrid) inverseMap() {
	lg.AtPosition = make(map[LetterPos]int)

	for key, value := range lg.PositionsOf {
		lg.AtPosition[value] = key
	}
}

func (lg *LetterGrid) letterMap() {
	lg.ToTile = make(map[int]LetterTile)

	for _, letter := range lg.Tiles {
		lg.ToTile[letter.ID] = letter
	}
}

func (lg *LetterGrid) AddTile(tile LetterTile, x int, y int) {
	var pos LetterPos = LetterPos{x, y}

	lg.Tiles = append(lg.Tiles, tile)
	lg.ToTile[tile.ID] = tile
	lg.PositionsOf[tile.ID] = pos
	lg.AtPosition[pos] = tile.ID
}

func (lg *LetterGrid) MoveTile(tile_id int, x int, y int) {
	var old_pos LetterPos = lg.PositionsOf[tile_id]
	var new_pos LetterPos = LetterPos{x, y}

	// Remove the old position key
	delete(lg.AtPosition, old_pos)

	// Add the new position information
	lg.PositionsOf[tile_id] = new_pos
	lg.AtPosition[new_pos] = tile_id
}

func (lg *LetterGrid) SwapTile(first int, second int) {
	var first_pos LetterPos = lg.PositionsOf[first]
	var second_pos LetterPos = lg.PositionsOf[second]

	lg.AtPosition[second_pos] = first
	lg.AtPosition[first_pos] = second

	lg.PositionsOf[first] = second_pos
	lg.PositionsOf[second] = first_pos
}

func (lg *LetterGrid) RemoveTile(tile_id int) {
	var tile_index = -1
	for index, tile := range lg.Tiles {
		if tile.ID == tile_id {
			tile_index = index
			break
		}
	}

	if tile_index == -1 {
		return
	}

	lg.Tiles = append(lg.Tiles[:tile_index], lg.Tiles[tile_index+1:]...)
	delete(lg.AtPosition, lg.PositionsOf[tile_id])
	delete(lg.PositionsOf, tile_id)
	delete(lg.ToTile, tile_id)
}
