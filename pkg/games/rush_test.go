package games

import (
	"strings"
	"testing"
)

func hasLetterInHand(game *RushState, player int, letter string) int {
	for _, tile := range game.Players[player].Hand {
		if tile.Value == strings.ToUpper(letter) {
			return tile.ID
		}
	}

	return -1
}

func validateTileIDs(t *testing.T, game *RushState) {
	var have_c = false
	var have_a = false
	var have_t = false
	var have_z = false

	for _, tile := range game.Tiles {
		if tile.ID <= 0 {
			t.Fatal("Invalid tile identifier: has non-positive identifier", tile, tile.ID, tile.Value)
		}

		if tile.Value != strings.ToUpper(tile.Value) {
			t.Fatal("Expecting tile value to be upper cased", tile, tile.ID, tile.Value)
		}

		if tile.Value == "C" {
			have_c = true
		}

		if tile.Value == "A" {
			have_a = true
		}

		if tile.Value == "T" {
			have_t = true
		}

		if tile.Value == "Z" {
			have_z = true
		}
	}

	if !have_c {
		game.Tiles = append(game.Tiles, LetterTile{len(game.Tiles) + 1, "", "C", 0})
	}

	if !have_a {
		game.Tiles = append(game.Tiles, LetterTile{len(game.Tiles) + 1, "", "A", 0})
	}

	if !have_t {
		game.Tiles = append(game.Tiles, LetterTile{len(game.Tiles) + 1, "", "T", 0})
	}

	if !have_z {
		game.Tiles = append(game.Tiles, LetterTile{len(game.Tiles) + 1, "", "Z", 0})
	}
}

func TestRushGame(t *testing.T) {
	var config RushConfig
	config.NumPlayers = 4
	config.NumTiles = 76
	config.TilesPerPlayer = true
	config.StartSize = 13
	config.DrawSize = 1
	config.DiscardPenalty = 3
	config.Frequency = BananagramsFreq

	if err := config.Validate(); err != nil {
		t.Fatal("Unable to validate good configuration", err)
	}

	var game RushState
	if err := game.Init(config); err != nil {
		t.Fatal("Unable to initialize game with good configration", err)
	}
	if err := game.Start(config.NumPlayers); err != nil {
		t.Fatal("Unable to start game with good configration", err)
	}
	validateTileIDs(t, &game)

	var player int = 0

	// Try and spell "cat" with player one; dump random tiles until we find
	// enough letters.
	for hasLetterInHand(&game, player, "C") == -1 || hasLetterInHand(&game, player, "A") == -1 || hasLetterInHand(&game, player, "T") == -1 || hasLetterInHand(&game, player, "Z") == -1 {
		var tile_to_discard = -1
		for _, tile := range game.Players[player].Hand {
			if tile.Value != "C" && tile.Value != "A" && tile.Value != "T" && tile.Value != "Z" {
				tile_to_discard = tile.ID
				break
			}
		}

		if tile_to_discard == -1 {
			t.Error("Unable to find suitable tile to discard")
		}

		if err := game.Discard(player, tile_to_discard); err != nil {
			t.Error("Unable to discard tile", err)
		}
	}

	// We should now have all tiles in our hand. Play them on the board.
	{
		tile_id := hasLetterInHand(&game, player, "C")
		if err := game.PlayTile(player, tile_id, 0, 0); err != nil {
			t.Fatal("Unable to play C tile on board", err, tile_id)
		}

		// Validate that "c" on the board is invalid due to size constraints.
		if err := game.IsValidBoard(player); err == nil {
			t.Fatal("Expected `c` board to be invalid but was valid", err)
		}

		tile_id = hasLetterInHand(&game, player, "T")
		if err := game.PlayTile(player, tile_id, 0, 2); err != nil {
			t.Fatal("Unable to play T tile on board", err, tile_id)
		}

		// Validate that "c t" on the board is invalid due to connectivity
		// constraints.
		if err := game.IsValidBoard(player); err == nil {
			t.Fatal("Expected `c t` board to be invalid but was valid:", err)
		}

		tile_id = hasLetterInHand(&game, player, "A")
		if err := game.PlayTile(player, tile_id, 0, 1); err != nil {
			t.Fatal("Unable to play A tile on board:", err, tile_id)
		}

		// Validate that "cat" on the board is valid.
		if err := game.IsValidBoard(player); err != nil {
			t.Fatal("Expected `cat` board to be valid but wasn't:", err)
		}
	}

	// Now play the Z and make sure the board isn't valid still.
	{
		tile_id := hasLetterInHand(&game, player, "Z")
		if err := game.PlayTile(player, tile_id, 0, 3); err != nil {
			t.Fatal("Unable to play Z tile on board:", err, tile_id)
		}

		// Validate that "catz" on the board is invalid.
		if err := game.IsValidBoard(player); err == nil {
			t.Fatal("Expected `catz` board to be invalid but was valid:", err)
		}

		// Recall the Z
		if err := game.RecallTile(player, tile_id); err != nil {
			t.Fatal("Unable to recall Z from board:", err)
		}
	}

	// Check if we can draw by nasty, nasty hacks.
	{
		if err := game.Draw(player, -1); err == nil {
			t.Fatal("Expected draw to fail with tiles remaining in hand")
		}

		game.Tiles = append(game.Tiles, game.Players[player].Hand...)
		game.Players[player].Hand = make([]LetterTile, 0)

		if err := game.Draw(player, -1); err == nil {
			t.Fatal("Expected draw to fail with old DrawID")
		}

		if err := game.Draw(player, game.DrawID); err != nil {
			t.Fatal("Expected draw to succeed, but failed:", err)
		}
	}
}
