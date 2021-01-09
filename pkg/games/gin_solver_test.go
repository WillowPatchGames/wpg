package games

import (
	"testing"
)

type HandEntry struct {
	Hand    []Card
	IsGroup bool
	IsRun   bool
	IsKind  bool
}

type ValidGroupEntry struct {
	solver  GinSolver
	entries []HandEntry
}

func TestIsValidGroup(t *testing.T) {
	// pass
}
