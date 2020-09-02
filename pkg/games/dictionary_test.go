package games

import (
	"testing"
)

func TestWordlist(t *testing.T) {
	if !IsWord("alphabet") {
		t.Error("alphabet isn't a word but should be")
	}

	if IsWord("superlongthingthatshouldntbeaword") {
		t.Error("superlongthingthatshouldntbeaword is a word but shouldn't be")
	}
}
