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

func (lg *LetterGrid) MoveTile(tileID int, x int, y int) {
	var oldPos LetterPos = lg.PositionsOf[tileID]
	var newPos LetterPos = LetterPos{x, y}

	// Remove the old position key
	delete(lg.AtPosition, oldPos)

	// Add the new position information
	lg.PositionsOf[tileID] = newPos
	lg.AtPosition[newPos] = tileID
}

func (lg *LetterGrid) SwapTile(first int, second int) {
	var firstPos LetterPos = lg.PositionsOf[first]
	var secondPos LetterPos = lg.PositionsOf[second]

	lg.AtPosition[secondPos] = first
	lg.AtPosition[firstPos] = second

	lg.PositionsOf[first] = secondPos
	lg.PositionsOf[second] = firstPos
}

func (lg *LetterGrid) RemoveTile(tileID int) {
	var tileIndex = -1
	for index, tile := range lg.Tiles {
		if tile.ID == tileID {
			tileIndex = index
			break
		}
	}

	if tileIndex == -1 {
		return
	}

	lg.Tiles = append(lg.Tiles[:tileIndex], lg.Tiles[tileIndex+1:]...)
	delete(lg.AtPosition, lg.PositionsOf[tileID])
	delete(lg.PositionsOf, tileID)
	delete(lg.ToTile, tileID)
}

func (lg *LetterGrid) visitLeftToRight(start LetterPos, visitor func(lg *LetterGrid, start LetterPos, end LetterPos, word string) error) error {
	var word string
	var end LetterPos = LetterPos{start.X, start.Y}

	tileID, ok := lg.AtPosition[end]

	for ok {
		tile := lg.ToTile[tileID]
		word += tile.Value
		end.X++
		tileID, ok = lg.AtPosition[end]
	}

	end.X--

	return visitor(lg, start, end, word)
}

func (lg *LetterGrid) visitTopToBottom(start LetterPos, visitor func(lg *LetterGrid, start LetterPos, end LetterPos, word string) error) error {
	var word string
	var end LetterPos = LetterPos{start.X, start.Y}

	tileID, ok := lg.AtPosition[end]
	for ok {
		tile := lg.ToTile[tileID]
		word += tile.Value
		end.Y++
		tileID, ok = lg.AtPosition[end]
	}

	end.Y--

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
		var leftPos LetterPos = LetterPos{position.X - 1, position.Y}
		var rightPos LetterPos = LetterPos{position.X + 1, position.Y}
		if _, ok := lg.AtPosition[leftPos]; !ok {
			if _, ok := lg.AtPosition[rightPos]; ok {
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
		var topPos LetterPos = LetterPos{position.X, position.Y - 1}
		var downPos LetterPos = LetterPos{position.X, position.Y + 1}
		if _, ok := lg.AtPosition[topPos]; !ok {
			if _, ok := lg.AtPosition[downPos]; ok {
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
