package game

import (
	"encoding/json"
	"math/rand"

	"git.cipherboy.com/WordCorp/api/internal/utils"
)

var letterfreq = map[string]float64{
	"A": 8.04,
	"B": 1.48,
	"C": 3.34,
	"D": 3.82,
	"E": 12.49,
	"F": 2.40,
	"G": 1.87,
	"H": 5.05,
	"I": 7.57,
	"J": 0.16,
	"K": 0.54,
	"L": 4.07,
	"M": 2.51,
	"N": 7.23,
	"O": 7.64,
	"P": 2.14,
	"Q": 0.12,
	"R": 6.28,
	"S": 6.51,
	"T": 9.28,
	"U": 2.73,
	"V": 1.05,
	"W": 1.68,
	"X": 0.23,
	"Y": 1.66,
	"Z": 0.09,
}

func randomLetter() string {
	i := utils.RandomFloat64() * 99.98
	for letter := range letterfreq {
		i -= letterfreq[letter]
		if i < 0.0 {
			return letter
		}
	}
	return "E"
}

func (g *GameState) nextLetter() Letter {
	letter := g.Letters[0]
	g.Letters = g.Letters[1:]
	return letter
}

func (g *GameState) addLetter(letter Letter) {
	g.Letters = append(g.Letters, letter)
}

type PlayerState struct {
	Letters []Letter `json:"letters"`
	//board   *map[Letter]JSONPos
}

func newPlayerState() *PlayerState {
	return &PlayerState{
		Letters: make([]Letter, 0),
	}
}

// Pos of a tile in the player's board
type JSONPos struct {
	Area string `json:"area"`
	Idx  []int  `json:"idx"`
}

func encodeBoard(board map[Letter]JSONPos) ([]byte, error) {
	var assoc map[string]JSONPos
	for l := range board {
		k, err := json.Marshal(l)
		if err != nil {
			return []byte{}, err
		}
		assoc[string(k)] = board[l]
	}
	return json.Marshal(assoc)
}

func decodeBoard(buf []byte) (*map[Letter]JSONPos, error) {
	var assoc map[string]JSONPos
	var res map[Letter]JSONPos
	err := json.Unmarshal(buf, &assoc)
	if err != nil {
		return &res, err
	}
	for k := range assoc {
		var l Letter
		err := json.Unmarshal([]byte(k), &l)
		if err != nil {
			return &res, err
		}
		res[l] = assoc[k]
	}
	return &res, nil
}

type GameState struct {
	Initialized bool     `json:"initialized"`
	Letters     []Letter `json:"letters"`
}

func newGameState(tilepile int) *GameState {
	letters := make([]Letter, tilepile)
	for i := range letters {
		letters[i] = Letter{int32(i), randomLetter()}
	}

	rand.Shuffle(len(letters), func(i, j int) {
		letters[i], letters[j] = letters[j], letters[i]
	})

	return &GameState{
		true,
		letters,
	}
}
