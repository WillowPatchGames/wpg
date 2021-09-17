package games

import (
	"log"

	"sync"
)

type EJSBoardCache struct {
	mutex       sync.Mutex
	initialized bool

	// Key Structure:
	// bool: whether or not corners are wild
	// int: width
	// int: height
	// int: x coordinate
	// int: y coordinate
	// int: Value: deck index to pull from
	Spiral map[bool]map[int]map[int]map[int]map[int]int

	// Key Structure:
	// int: x coordinate
	// int: y coordinate
	// int: Value: deck index to pull from
	Pinwheel map[int]map[int]int
}

func (ebc *EJSBoardCache) Initialize() {
	if ebc.initialized {
		return
	}

	ebc.mutex.Lock()
	defer ebc.mutex.Unlock()

	if ebc.initialized {
		return
	}

	ebc.Spiral = make(map[bool]map[int]map[int]map[int]map[int]int)
	for i_wild_corners := 0; i_wild_corners <= 1; i_wild_corners++ {
		var wild_corners bool = i_wild_corners == 0
		ebc.Spiral[wild_corners] = make(map[int]map[int]map[int]map[int]int)
		for width := 8; width <= 10; width++ {
			ebc.Spiral[wild_corners][width] = make(map[int]map[int]map[int]int)
			for height := 8; height <= 10; height++ {
				if !wild_corners && width == 10 && height == 10 {
					continue
				}

				ebc.Spiral[wild_corners][width][height] = ejsComputeSpiral(wild_corners, width, height)
			}
		}
	}

	ebc.Pinwheel = ejsComputePinwheel()

	ebc.initialized = true
}

var ejs_board_cache EJSBoardCache

func EJSBoardIndexScheme(deck *Deck, layout int, width int, height int, x int, y int, wild_corners bool) Card {
	// XXX: Hack: Since the identifiers must be preserved, we need to iterate
	// over the board left to right, top to bottom to preserve the scheme
	// (or compute it artificially). However, since the main eightjacks file is
	// long enough as it is, I've chosen to move this code out and preserve the
	// single loop. So, instead, we create a _deck_ indexing scheme, whereby
	// whatever pattern (from a sorted deck) we want to create, we can, and just
	// need to convert from x/y coordinates to an index in the deck. This gets
	// cached into the ejs_board_cache variable and initialized once per server
	// startup. This allows us to compute the answer (rather than hard-coding it),
	// while limiting the computation to a single time.
	ejs_board_cache.Initialize()

	if layout == 1 || layout == 4 {
		// Sorted and Random layouts can simply take the top card. No need to go
		// into the cache.
		return *deck.Draw()
	} else if layout == 2 {
		cache := ejs_board_cache.Spiral[wild_corners][width][height]
		return *deck.Cards[cache[x][y]]
	} else if layout == 3 {
		return *deck.Cards[ejs_board_cache.Pinwheel[x][y]]
	}

	panic("unknown type of request")
}

func ejsComputeSpiral(wild_corners bool, width int, height int) map[int]map[int]int {
	// For spiral layouts, we construct a map of x,y coordinate to index
	// and then populate the indices (into the deck) in a spiral iteration
	// pattern.
	var deck_indices map[int]map[int]int = make(map[int]map[int]int)
	for i := 0; i < width; i++ {
		deck_indices[i] = make(map[int]int)
		for j := 0; j < height; j++ {
			deck_indices[i][j] = -1
		}
	}

	x := 0
	y := 0
	depth := 0
	direction := 0 // 0:right, 1:down, 2:right, 3:up
	remaining := width * height
	deck_index := 0

	if wild_corners {
		deck_indices[0][0] = -2
		deck_indices[0][height-1] = -2
		deck_indices[width-1][0] = -2
		deck_indices[width-1][height-1] = -2
		remaining -= 4
	}

	for {
		var increment_count int = 0
		for deck_indices[x][y] != -1 {
			x, y, depth, direction = ejsBoardSpiralIncrement(x, y, depth, direction, width, height)
			increment_count += 1
			if increment_count > 20 {
				panic("unable to call ejsBoardSpiralIncrement and reach new location")
			}
		}

		deck_indices[x][y] = deck_index
		deck_index += 1
		remaining -= 1
		if remaining == 0 {
			break
		}
	}

	return deck_indices
}

func ejsBoardSpiralIncrement(x int, y int, depth int, direction int, width int, height int) (int, int, int, int) {
	var new_x = x
	var new_y = y
	var new_depth = depth
	var new_direction = direction

	if depth > width || depth > height {
		panic("Depth exceeded width or height")
	}

	if direction == 0 {
		// Heading right
		new_x = x + 1
		if new_x == width-depth {
			// Hit the right side, back up our x and increment y and start going down
			// instead.
			new_x = x
			new_y = y + 1
			new_direction = 1
		}
	} else if direction == 1 {
		// Heading down
		new_y = y + 1
		if new_y == height-depth {
			// Hit the bottom side, back up our y and decrement x and start going
			// left.
			new_x = x - 1
			new_y = y
			new_direction = 2
		}
	} else if direction == 2 {
		// Heading left
		new_x = x - 1
		if new_x < depth {
			// Hit the left side, back up our x and decrement y and start going
			// up. Note that we need to increment depth here, to avoid hitting the
			// side we already started on.
			new_x = x
			new_y = y - 1
			new_direction = 3
			new_depth = depth + 1
		}
	} else if direction == 3 {
		// Heading up
		new_y = y - 1
		if new_y < depth {
			// Hit the top side, back up our y and start going right..
			new_x = x + 1
			new_y = y
			new_direction = 0
		}
	} else {
		panic("Unknown direction")
	}

	return new_x, new_y, new_depth, new_direction
}

func ejsComputePinwheel() map[int]map[int]int {
	// Pinwheel is hard-coded. Only valid for a single variant: wild corners and
	// width == height == 10
	var width = 10
	var height = 10

	var deck_indices map[int]map[int]int = make(map[int]map[int]int)
	for i := 0; i < width; i++ {
		deck_indices[i] = make(map[int]int)
		for j := 0; j < height; j++ {
			deck_indices[i][j] = -1
		}
	}

	deck_indices[0][0] = -2
	deck_indices[0][height-1] = -2
	deck_indices[width-1][0] = -2
	deck_indices[width-1][height-1] = -2

	var index int = 0
	deck_indices[0][1] = index
	index++
	deck_indices[0][2] = index
	index++
	deck_indices[0][3] = index
	index++
	deck_indices[0][4] = index
	index++
	deck_indices[1][4] = index
	index++
	deck_indices[1][3] = index
	index++
	deck_indices[1][2] = index
	index++
	deck_indices[1][1] = index
	index++
	deck_indices[2][2] = index
	index++
	deck_indices[2][3] = index
	index++
	deck_indices[2][4] = index
	index++
	deck_indices[3][4] = index
	index++
	deck_indices[0][8] = index
	index++
	deck_indices[0][7] = index
	index++
	deck_indices[0][6] = index
	index++
	deck_indices[0][5] = index
	index++
	deck_indices[1][5] = index
	index++
	deck_indices[1][6] = index
	index++
	deck_indices[1][7] = index
	index++
	deck_indices[1][8] = index
	index++
	deck_indices[2][7] = index
	index++
	deck_indices[2][6] = index
	index++
	deck_indices[2][5] = index
	index++
	deck_indices[3][5] = index
	index++
	deck_indices[1][9] = index
	index++
	deck_indices[2][9] = index
	index++
	deck_indices[3][9] = index
	index++
	deck_indices[4][9] = index
	index++
	deck_indices[4][8] = index
	index++
	deck_indices[3][8] = index
	index++
	deck_indices[2][8] = index
	index++
	deck_indices[3][7] = index
	index++
	deck_indices[4][7] = index
	index++
	deck_indices[4][6] = index
	index++
	deck_indices[3][6] = index
	index++
	deck_indices[4][5] = index
	index++
	deck_indices[1][0] = index
	index++
	deck_indices[2][0] = index
	index++
	deck_indices[3][0] = index
	index++
	deck_indices[4][0] = index
	index++
	deck_indices[4][1] = index
	index++
	deck_indices[3][1] = index
	index++
	deck_indices[2][1] = index
	index++
	deck_indices[3][2] = index
	index++
	deck_indices[4][2] = index
	index++
	deck_indices[4][3] = index
	index++
	deck_indices[3][3] = index
	index++
	deck_indices[4][4] = index
	index++

	// The pinwheel is mirrored across both the x and the y axis. Since index is
	// the next card in the deck and starts at zero, we can add index to the
	// existing but mirrored value to get the location for the next card.
	for x := 5; x < width; x++ {
		for y := 0; y < height; y++ {
			old_x := 9 - x
			old_y := 9 - y

			deck_indices[x][y] = deck_indices[old_x][old_y] + index
		}
	}

	for x := 0; x < width; x++ {
		for y := 0; y < height; y++ {
			if deck_indices[x][y] == -1 {
				log.Println("at index", x, y, " got uninitialized square")
				panic("invalid pinwheel layout")
			}
		}
	}

	return deck_indices
}
