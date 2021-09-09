package game

import (
	"net/http"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/utils"

	"git.cipherboy.com/WillowPatchGames/wpg/pkg/games"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/figgy"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/hwaterr"
)

type GameConfig struct {
	Description string                   `json:"description"`
	Name        string                   `json:"name"`
	Options     []map[string]interface{} `json:"options"`
}

type ConfigHandler struct {
	hwaterr.ErrableHandler
	utils.HTTPRequestHandler

	resp map[string]*GameConfig
}

func (handle *ConfigHandler) GetResponse() interface{} {
	return handle.resp
}

func (handle *ConfigHandler) GetObjectPointer() interface{} { return nil }

func (handle *ConfigHandler) Serialize() {
	var err error
	handle.resp = make(map[string]*GameConfig)

	var rush = &GameConfig{
		Description: "In Rush, when one player draws a tile, all players must draw tiles and catch up – first to finish their board when there are no more tiles left wins!",
		Name:        "Rush (Fast-Paced Word Game)",
	}
	rush.Options, err = figgy.SerializeOptions(&games.RushConfig{})
	if err != nil {
		panic("Unable to serialize Rush configuration: " + err.Error())
	}

	var spades = &GameConfig{
		Description: "In Spades, players bid how many tricks they will take. If they make their bid, they get more points. First to a set amount wins!",
		Name:        "Spades (Card Game)",
	}
	spades.Options, err = figgy.SerializeOptions(&games.SpadesConfig{})
	if err != nil {
		panic("Unable to serialize spades configuration: " + err.Error())
	}

	var hearts = &GameConfig{
		Description: "In Hearts, players pass cards and avoid taking tricks with Hearts or the Queen of Spades. Be careful though: let someone get all the points and they'll shoot the moon!",
		Name:        "Hearts (Card Game)",
	}
	hearts.Options, err = figgy.SerializeOptions(&games.HeartsConfig{})
	if err != nil {
		panic("Unable to serialize hearts configuration: " + err.Error())
	}

	var ej = &GameConfig{
		Description: "In Eight Jacks, players compete to create runs of cards on the board. Runs can be diagonal, left or right, or up and down. Watch those jacks and jokers carefully!",
		Name:        "Eight Jacks (Card Game)",
	}
	ej.Options, err = figgy.SerializeOptions(&games.EightJacksConfig{})
	if err != nil {
		panic("Unable to serialize eight jacks configuration: " + err.Error())
	}

	var tt = &GameConfig{
		Description: "In Three Thirteen, players compete against each other to score the least points each round. Each round, a new wild card pops up... try not to discard it!",
		Name:        "Three Thirteen (Card Game)",
	}
	tt.Options, err = figgy.SerializeOptions(&games.ThreeThirteenConfig{})
	if err != nil {
		panic("Unable to serialize three thirteen configuration: " + err.Error())
	}

	var gin = &GameConfig{
		Description: "In Gin, players compete against each other to go out each round.",
		Name:        "Gin (Card Game)",
	}
	gin.Options, err = figgy.SerializeOptions(&games.GinConfig{})
	if err != nil {
		panic("Unable to serialize gin configuration: " + err.Error())
	}

	handle.resp["rush"] = rush
	handle.resp["spades"] = spades
	handle.resp["hearts"] = hearts
	handle.resp["eight jacks"] = ej
	handle.resp["three thirteen"] = tt
	handle.resp["gin"] = gin
}

func (handle *ConfigHandler) ServeErrableHTTP(w http.ResponseWriter, r *http.Request) error {
	utils.SendResponse(w, r, handle)
	return nil
}
