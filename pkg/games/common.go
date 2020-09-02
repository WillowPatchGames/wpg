package games

import (
	"encoding/json"
	"fmt"
)

type GameConfigError struct {
	Parameter     string
	Value         string
	AllowedValues string
}

func (gce GameConfigError) Error() string {
	if len(gce.AllowedValues) > 0 {
		return fmt.Sprintf("Invalid value for parameter: %s has value %s; allowed: %s", gce.Parameter, gce.Value, gce.AllowedValues)
	}

	return fmt.Sprintf("Invalid value for parameter: %s has value %s", gce.Parameter, gce.Value)
}

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
