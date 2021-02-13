package game

import (
	"net/http"

	"gorm.io/gorm"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
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

	var ej = &GameConfig{
		Description: "In Eight Jacks, players compete to create runs of cards on the board. Runs can be diagonal, left or right, or up and down. Watch those jacks and jokers carefully!",
		Name:        "Eight Jacks (Card Game)",
	}
	ej.Options, err = figgy.SerializeOptions(&games.EightJacksConfig{})
	if err != nil {
		panic("Unable to serialize configuration: " + err.Error())
	}

	handle.resp["eight jacks"] = ej
}

func (handle *ConfigHandler) ServeErrableHTTP(w http.ResponseWriter, r *http.Request) error {
	if err := database.InTransaction(func(tx *gorm.DB) error {
		return tx.Model(&database.Plan{}).Where("visible = ?", true).Select("id").Find(&handle.resp).Error
	}); err != nil {
		return err
	}

	utils.SendResponse(w, r, handle)
	return nil
}
