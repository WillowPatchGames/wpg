package business

import (
	"testing"

	"gorm.io/gorm"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
)

func TestCanCreateGame(t *testing.T) {
	if err := database.OpenDatabase("sqlite", "file::memory:?cache=shared", false); err != nil {
		t.Fatal(err)
	}

	if err := database.InTransaction(func(tx *gorm.DB) error {
		return LoadPlanConfig(tx, "../../configs/testing-plans.yaml")
	}); err != nil {
		t.Fatal(err)
	}
}
