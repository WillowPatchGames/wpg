package games

import (
	"encoding/json"
)

type LetterTile struct {
	ID      int    `json:"id"`
	Display string `json:"display,omitempty"`
	Value   string `json:"value"`
	Score   int    `json:"score,omitempty"`
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

func (lg *LetterGrid) Init() {
	lg.Tiles = make([]LetterTile, 0)
	lg.ToTile = make(map[int]LetterTile)
	lg.PositionsOf = make(map[int]LetterPos)
	lg.AtPosition = make(map[LetterPos]int)
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

func (lg *LetterGrid) visitLeftToRight(start LetterPos, visitor func(lg *LetterGrid, start LetterPos, end LetterPos, word string) error) error {
	var word string
	var end LetterPos = LetterPos{start.X, start.Y}

	tile_id, ok := lg.AtPosition[end]

	for ok {
		tile := lg.ToTile[tile_id]
		word += tile.Value
		end.X += 1
		tile_id, ok = lg.AtPosition[end]
	}

	end.X -= 1

	return visitor(lg, start, end, word)
}

func (lg *LetterGrid) visitTopToBottom(start LetterPos, visitor func(lg *LetterGrid, start LetterPos, end LetterPos, word string) error) error {
	var word string
	var end LetterPos = LetterPos{start.X, start.Y}

	tile_id, ok := lg.AtPosition[end]
	for ok {
		tile := lg.ToTile[tile_id]
		word += tile.Value
		end.Y += 1
		tile_id, ok = lg.AtPosition[end]
	}

	end.Y -= 1

	return visitor(lg, start, end, word)
}

func (lg *LetterGrid) VisitAllWordsOnBoard(visitor func(lg *LetterGrid, start LetterPos, end LetterPos, word string) error) error {
	// Words on a LetterGrid are formed either top->down or left->right. Visit
	// all two-letter-or-more words in this order, once. To do so, we only visit
	// when a particular location is the start of a word, and skip trying to find
	// a word from a middle character.
	for position := range lg.AtPosition {
		// Check if there's a tile to the left; if not, this is the start of a
		// word. Also check if there's a tile to the right; otherwise, this ends
		// up being a one-letter word, which we don't validate.
		var left_pos LetterPos = LetterPos{position.X - 1, position.Y}
		var right_pos LetterPos = LetterPos{position.X + 1, position.Y}
		if _, ok := lg.AtPosition[left_pos]; !ok {
			if _, ok := lg.AtPosition[right_pos]; ok {
				// This is the start of a word. Visit left->right from this position.
				err := lg.visitLeftToRight(position, visitor)
				if err != nil {
					return err
				}
			}
		}

		// Check if there's a tile to the top; if not, this is the start of a
		// word. Also check if there's a tile to the bottom; otherwise, this ends
		// up being a one-letter word, which we don't validate.
		var top_pos LetterPos = LetterPos{position.X, position.Y - 1}
		var down_pos LetterPos = LetterPos{position.X, position.Y + 1}
		if _, ok := lg.AtPosition[top_pos]; !ok {
			if _, ok := lg.AtPosition[down_pos]; ok {
				// This is the start of a word. Visit left->right from this position.
				err := lg.visitTopToBottom(position, visitor)
				if err != nil {
					return err
				}
			}
		}
	}

	return nil
}

func (lg *LetterGrid) IsAllConnected() bool {
	if len(lg.Tiles) <= 1 {
		// Trivially connected board is the empty board.
		return true
	}

	var visited map[LetterPos]bool = make(map[LetterPos]bool)
	var queue []LetterPos = make([]LetterPos, 0)

	// Start at any random position
	queue = append(queue, lg.PositionsOf[lg.Tiles[0].ID])
	for len(queue) > 0 {
		// Take the top item off the queue
		var current = queue[0]
		queue = queue[1:]

		// Mark node as visited
		visited[current] = true

		// For all possible neighboring tiles
		for dx := -1; dx <= 1; dx++ {
			for dy := -1; dy <= 1; dy++ {
				if (dx != 0 && dy != 0) || (dx == 0 && dy == 0) {
					continue
				}

				var neighbor LetterPos = LetterPos{current.X + dx, current.Y + dy}
				if _, ok := lg.AtPosition[neighbor]; ok {
					// Check if we already visited the neighbor and if so, don't revisit
					// it.
					if visited, ok := visited[neighbor]; !ok || !visited {
						queue = append(queue, neighbor)
					}
				}
			}
		}
	}

	// Check whether or not we skipped any positions
	for position := range lg.AtPosition {
		if visited, ok := visited[position]; !ok || !visited {
			return false
		}
	}

	return true
}
