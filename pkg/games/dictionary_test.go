package games

import (
	"testing"
)

func TestWordlist(t *testing.T) {
	if !IsWord("alphabet") {
		t.Fatal("alphabet isn't a word but should be")
	}

	if !IsWord("cat") {
		t.Fatal("cat isn't a word but should be")
	}

	if !IsWord("ew") {
		t.Fatal("ew isn't a word but should be")
	}

	if IsWord("superlongthingthatshouldntbeaword") {
		t.Fatal("superlongthingthatshouldntbeaword is a word but shouldn't be")
	}

	if IsWord("catz") {
		t.Fatal("catz is a word but shouldn't be")
	}
}
