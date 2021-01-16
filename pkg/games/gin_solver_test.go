package games

import (
	"testing"
)

type HandEntry struct {
	Hand   []Card
	IsRun  bool
	IsKind bool
}

type ValidGroupEntry struct {
	Solver  GinSolver
	Entries []HandEntry
}

var DefaultPointValue = map[CardRank]int{
	NoneRank:  0,
	AceRank:   1,
	TwoRank:   2,
	ThreeRank: 3,
	FourRank:  4,
	FiveRank:  5,
	SixRank:   6,
	SevenRank: 7,
	EightRank: 8,
	NineRank:  9,
	TenRank:   10,
	JackRank:  11,
	QueenRank: 12,
	KingRank:  13,
	JokerRank: 20,
}

var defaultSolver = GinSolver{
	PointValue:       DefaultPointValue,
	WildCards:        []CardRank{JokerRank},
	AnyWildGroup:     false,
	WildAsRank:       false,
	AllWildGroups:    false,
	MostlyWildGroups: false,
	WildJokerRanked:  false,
	SameSuitRuns:     false,
	AceHigh:          false,
	AceLow:           true,
	RunsWrap:         false,
}

func addWildCard(rank CardRank) func(bool, GinSolver) GinSolver {
	return func(yes bool, gs GinSolver) GinSolver {
		if yes {
			gs.WildCards = append(gs.WildCards, rank)
		}
		return gs
	}
}
func setAnyWildGroup(yes bool, gs GinSolver) GinSolver {
	gs.AnyWildGroup = yes
	return gs
}
func setWildAsRank(yes bool, gs GinSolver) GinSolver {
	gs.WildAsRank = yes
	return gs
}
func setAllWildGroups(yes bool, gs GinSolver) GinSolver {
	gs.AllWildGroups = yes
	return gs
}
func setMostlyWildGroups(yes bool, gs GinSolver) GinSolver {
	gs.MostlyWildGroups = yes
	return gs
}
func setSameSuitRuns(yes bool, gs GinSolver) GinSolver {
	gs.SameSuitRuns = yes
	return gs
}
func setAceHigh(yes bool, gs GinSolver) GinSolver {
	gs.AceHigh = yes
	return gs
}
func setAceLow(yes bool, gs GinSolver) GinSolver {
	gs.AceLow = yes
	return gs
}
func setRunsWrap(yes bool, gs GinSolver) GinSolver {
	gs.RunsWrap = yes
	return gs
}

type GinSetter = func(bool, GinSolver) GinSolver

var allOptions = []GinSetter{
	setAnyWildGroup,
	setWildAsRank,
	setAllWildGroups,
	setMostlyWildGroups,
	setSameSuitRuns,
	setAceHigh,
	setAceLow,
	setRunsWrap,
}

// Return GinSolvers with all permutations of fields set
// (based on a default GinSolver)
func across(fields []GinSetter, df GinSolver) []GinSolver {
	// No fields left: return just the default
	if len(fields) == 0 {
		return []GinSolver{df}
	}
	// Set one field (to true and then to false)
	// atop permuting the rest
	setThis := fields[0]
	theRest := fields[1:]
	return append(
		across(theRest, setThis(false, df)),
		across(theRest, setThis(true, df))...,
	)
}

// Test one hand across multiple GinSolver configurations,
// providing functions to verify isRun and isRank based on
// the particular GinSolver
func handAcross(
	fields []GinSetter, df GinSolver, hand []Card,
	isRun func(GinSolver) bool, isRank func(GinSolver) bool,
) []ValidGroupEntry {
	ret := make([]ValidGroupEntry, 0)
	for _, solver := range across(fields, df) {
		ret = append(ret, ValidGroupEntry{
			Solver: solver,
			Entries: []HandEntry{
				HandEntry{
					Hand:   hand,
					IsRun:  isRun(solver),
					IsKind: isRank(solver),
				},
			},
		})
	}
	return ret
}

// Test multiple hands across GinSolver configurations
func handsAcross(
	fields []GinSetter, df GinSolver, hands [][]Card,
	isRun func([]Card, GinSolver) bool, isRank func([]Card, GinSolver) bool,
) []ValidGroupEntry {
	ret := make([]ValidGroupEntry, 0)
	for _, hand := range hands {
		ret = append(ret, handAcross(fields,
			df,
			hand,
			func(gs GinSolver) bool {
				return isRun(hand, gs)
			},
			func(gs GinSolver) bool {
				return isRank(hand, gs)
			},
		)...)
	}
	return ret
}

var MoreCases = [][]ValidGroupEntry{
	handAcross(
		allOptions, defaultSolver,
		[]Card{
			Card{0, SpadesSuit, AceRank},
			Card{0, SpadesSuit, QueenRank},
			Card{0, NoneSuit, JokerRank},
		},
		func(gs GinSolver) bool {
			return gs.AceHigh || gs.RunsWrap
		},
		func(gs GinSolver) bool {
			return false
		},
	),
	handAcross(
		allOptions, defaultSolver,
		[]Card{
			Card{0, SpadesSuit, AceRank},
			Card{0, NoneSuit, JokerRank},
			Card{0, SpadesSuit, ThreeRank},
		},
		func(gs GinSolver) bool {
			return gs.AceLow || gs.RunsWrap || !gs.AceHigh
		},
		func(gs GinSolver) bool {
			return false
		},
	),
	handAcross(
		allOptions, defaultSolver,
		[]Card{
			Card{0, NoneSuit, JokerRank},
			Card{0, NoneSuit, JokerRank},
			Card{0, NoneSuit, JokerRank},
		},
		func(gs GinSolver) bool {
			return gs.AnyWildGroup || gs.AllWildGroups
		},
		func(gs GinSolver) bool {
			return gs.AnyWildGroup || gs.AllWildGroups
		},
	),
	handsAcross(
		append(allOptions, addWildCard(FourRank)), defaultSolver,
		[][]Card{
			[]Card{
				Card{0, NoneSuit, JokerRank},
				Card{0, NoneSuit, JokerRank},
				Card{0, NoneSuit, JokerRank},
				Card{0, NoneSuit, FourRank},
			},
			[]Card{
				Card{0, NoneSuit, JokerRank},
				Card{0, NoneSuit, JokerRank},
				Card{0, NoneSuit, FourRank},
			},
			[]Card{
				Card{0, NoneSuit, JokerRank},
				Card{0, NoneSuit, FourRank},
			},
		},
		func(hand []Card, gs GinSolver) bool {
			if len(hand) < 3 {
				return false
			}
			fourWild := len(gs.WildCards) > 1
			return gs.AnyWildGroup || (gs.AllWildGroups && fourWild) ||
				(gs.MostlyWildGroups && (!fourWild || gs.WildAsRank))
		},
		func(hand []Card, gs GinSolver) bool {
			if len(hand) < 3 {
				return false
			}
			fourWild := len(gs.WildCards) > 1
			return gs.AnyWildGroup || (gs.AllWildGroups && fourWild) ||
				(gs.MostlyWildGroups && (!fourWild || gs.WildAsRank))
		},
	),
}

var TestCases = []ValidGroupEntry{
	ValidGroupEntry{
		Solver: GinSolver{
			PointValue:       DefaultPointValue,
			WildCards:        []CardRank{JokerRank},
			AnyWildGroup:     false,
			WildAsRank:       true,
			AllWildGroups:    false,
			MostlyWildGroups: false,
			WildJokerRanked:  false,
			SameSuitRuns:     false,
			AceHigh:          false,
			AceLow:           true,
			RunsWrap:         false,
		},
		Entries: []HandEntry{
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, FiveRank},
					Card{0, ClubsSuit, FourRank},
					Card{0, HeartsSuit, ThreeRank},
				},
				IsRun:  true,
				IsKind: false,
			},
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, FiveRank},
					Card{0, HeartsSuit, ThreeRank},
					Card{0, ClubsSuit, AceRank},
				},
				IsRun:  false,
				IsKind: false,
			},
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, FiveRank},
					Card{0, HeartsSuit, FiveRank},
					Card{0, ClubsSuit, FiveRank},
				},
				IsRun:  false,
				IsKind: true,
			},
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, FiveRank},
					Card{0, HeartsSuit, ThreeRank},
					Card{0, NoneSuit, JokerRank},
				},
				IsRun:  true,
				IsKind: false,
			},
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, FiveRank},
					Card{0, HeartsSuit, FourRank},
					Card{0, NoneSuit, JokerRank},
				},
				IsRun:  true,
				IsKind: false,
			},
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, FiveRank},
					Card{0, HeartsSuit, FourRank},
					Card{0, NoneSuit, JokerRank},
					Card{0, NoneSuit, JokerRank},
				},
				IsRun:  true,
				IsKind: false,
			},
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, ThreeRank},
					Card{0, HeartsSuit, TwoRank},
					Card{0, NoneSuit, JokerRank},
					Card{0, NoneSuit, JokerRank},
				},
				IsRun:  true,
				IsKind: false,
			},
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, FiveRank},
					Card{0, HeartsSuit, FourRank},
					Card{0, NoneSuit, JokerRank},
					Card{0, NoneSuit, JokerRank},
					Card{0, NoneSuit, JokerRank},
				},
				IsRun:  false,
				IsKind: false,
			},
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, FiveRank},
					Card{0, SpadesSuit, ThreeRank},
					Card{0, NoneSuit, JokerRank},
				},
				IsRun:  true,
				IsKind: false,
			},
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, FiveRank},
					Card{0, HeartsSuit, FiveRank},
					Card{0, NoneSuit, JokerRank},
				},
				IsRun:  false,
				IsKind: true,
			},
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, KingRank},
					Card{0, HeartsSuit, AceRank},
					Card{0, NoneSuit, JokerRank},
				},
				IsRun:  false,
				IsKind: false,
			},
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, KingRank},
					Card{0, HeartsSuit, QueenRank},
					Card{0, NoneSuit, JokerRank},
				},
				IsRun:  true,
				IsKind: false,
			},
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, KingRank},
					Card{0, HeartsSuit, JackRank},
					Card{0, NoneSuit, JokerRank},
				},
				IsRun:  true,
				IsKind: false,
			},
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, KingRank},
					Card{0, HeartsSuit, QueenRank},
					Card{0, HeartsSuit, JackRank},
					Card{0, HeartsSuit, TenRank},
					Card{0, HeartsSuit, NineRank},
					Card{0, HeartsSuit, EightRank},
					Card{0, HeartsSuit, SevenRank},
					Card{0, HeartsSuit, SixRank},
					Card{0, HeartsSuit, FiveRank},
					Card{0, HeartsSuit, FourRank},
					Card{0, HeartsSuit, ThreeRank},
					Card{0, HeartsSuit, TwoRank},
					Card{0, HeartsSuit, AceRank},
				},
				IsRun:  true,
				IsKind: false,
			},
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, KingRank},
					Card{0, HeartsSuit, QueenRank},
					Card{0, HeartsSuit, JackRank},
					Card{0, HeartsSuit, TenRank},
					Card{0, HeartsSuit, NineRank},
					Card{0, HeartsSuit, EightRank},
					Card{0, HeartsSuit, SevenRank},
					Card{0, HeartsSuit, SixRank},
					Card{0, HeartsSuit, FiveRank},
					Card{0, HeartsSuit, FourRank},
					Card{0, HeartsSuit, ThreeRank},
					Card{0, HeartsSuit, TwoRank},
					Card{0, HeartsSuit, AceRank},
					Card{0, NoneSuit, JokerRank},
				},
				IsRun:  false,
				IsKind: false,
			},
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, KingRank},
					Card{0, HeartsSuit, QueenRank},
					Card{0, HeartsSuit, JackRank},
					Card{0, NoneSuit, JokerRank},
					Card{0, HeartsSuit, NineRank},
					Card{0, HeartsSuit, EightRank},
					Card{0, HeartsSuit, SevenRank},
					Card{0, HeartsSuit, SixRank},
					Card{0, HeartsSuit, FiveRank},
					Card{0, HeartsSuit, FourRank},
					Card{0, HeartsSuit, ThreeRank},
					Card{0, HeartsSuit, TwoRank},
					Card{0, HeartsSuit, AceRank},
				},
				IsRun:  true,
				IsKind: false,
			},
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, KingRank},
					Card{0, HeartsSuit, QueenRank},
					Card{0, HeartsSuit, JackRank},
					Card{0, HeartsSuit, TenRank},
					Card{0, HeartsSuit, NineRank},
					Card{0, HeartsSuit, EightRank},
					Card{0, HeartsSuit, SevenRank},
					Card{0, HeartsSuit, SixRank},
					Card{0, NoneSuit, JokerRank},
					Card{0, HeartsSuit, FourRank},
					Card{0, HeartsSuit, ThreeRank},
					Card{0, HeartsSuit, TwoRank},
					Card{0, HeartsSuit, AceRank},
				},
				IsRun:  true,
				IsKind: false,
			},
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, KingRank},
					Card{0, HeartsSuit, QueenRank},
					Card{0, HeartsSuit, JackRank},
					Card{0, HeartsSuit, TenRank},
					Card{0, HeartsSuit, EightRank},
					Card{0, HeartsSuit, SevenRank},
					Card{0, HeartsSuit, SixRank},
					Card{0, HeartsSuit, FourRank},
					Card{0, HeartsSuit, ThreeRank},
					Card{0, HeartsSuit, TwoRank},
					Card{0, HeartsSuit, AceRank},
					Card{0, NoneSuit, JokerRank},
					Card{0, NoneSuit, JokerRank},
				},
				IsRun:  true,
				IsKind: false,
			},
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, KingRank},
					Card{0, HeartsSuit, QueenRank},
					Card{0, HeartsSuit, JackRank},
					Card{0, HeartsSuit, TenRank},
					Card{0, HeartsSuit, EightRank},
					Card{0, HeartsSuit, SevenRank},
					Card{0, HeartsSuit, SixRank},
					Card{0, HeartsSuit, FourRank},
					Card{0, HeartsSuit, ThreeRank},
					Card{0, HeartsSuit, TwoRank},
					Card{0, HeartsSuit, AceRank},
					Card{0, NoneSuit, JokerRank},
					Card{0, NoneSuit, JokerRank},
					Card{0, NoneSuit, JokerRank},
				},
				IsRun:  false,
				IsKind: false,
			},
			HandEntry{
				Hand: []Card{
					Card{0, NoneSuit, JokerRank},
					Card{0, NoneSuit, JokerRank},
					Card{0, NoneSuit, JokerRank},
				},
				IsRun:  false,
				IsKind: false,
			},
		},
	},
	ValidGroupEntry{
		Solver: GinSolver{
			PointValue:       DefaultPointValue,
			WildCards:        []CardRank{JokerRank, SevenRank},
			AnyWildGroup:     false,
			WildAsRank:       true,
			AllWildGroups:    true,
			MostlyWildGroups: false,
			WildJokerRanked:  false,
			SameSuitRuns:     true,
			AceHigh:          false,
			AceLow:           true,
			RunsWrap:         false,
		},
		Entries: []HandEntry{
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, FiveRank},
					Card{0, ClubsSuit, FourRank},
					Card{0, HeartsSuit, ThreeRank},
				},
				IsRun:  false,
				IsKind: false,
			},
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, FiveRank},
					Card{0, SpadesSuit, FourRank},
					Card{0, SpadesSuit, ThreeRank},
				},
				IsRun:  true,
				IsKind: false,
			},
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, SevenRank},
					Card{0, HeartsSuit, SevenRank},
					Card{0, DiamondsSuit, SevenRank},
					Card{0, SpadesSuit, SevenRank},
				},
				IsRun:  true,
				IsKind: true,
			},
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, SevenRank},
					Card{0, HeartsSuit, SevenRank},
					Card{0, SpadesSuit, EightRank},
				},
				IsRun:  true,
				IsKind: false,
			},
		},
	},
	ValidGroupEntry{
		Solver: GinSolver{
			PointValue:       DefaultPointValue,
			WildCards:        []CardRank{JokerRank},
			AnyWildGroup:     false,
			WildAsRank:       true,
			AllWildGroups:    false,
			MostlyWildGroups: false,
			WildJokerRanked:  false,
			SameSuitRuns:     true,
			AceHigh:          true,
			AceLow:           true,
			RunsWrap:         false,
		},
		Entries: []HandEntry{
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, FiveRank},
					Card{0, ClubsSuit, FourRank},
					Card{0, HeartsSuit, ThreeRank},
				},
				IsRun:  false,
				IsKind: false,
			},
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, FiveRank},
					Card{0, SpadesSuit, FourRank},
					Card{0, SpadesSuit, ThreeRank},
				},
				IsRun:  true,
				IsKind: false,
			},
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, QueenRank},
					Card{0, NoneSuit, JokerRank},
					Card{0, SpadesSuit, AceRank},
				},
				IsRun:  true,
				IsKind: false,
			},
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, QueenRank},
					Card{0, NoneSuit, JokerRank},
					Card{0, SpadesSuit, AceRank},
					Card{0, SpadesSuit, TwoRank},
				},
				IsRun:  false,
				IsKind: false,
			},
		},
	},
	ValidGroupEntry{
		Solver: GinSolver{
			PointValue:       DefaultPointValue,
			WildCards:        []CardRank{JokerRank},
			AnyWildGroup:     false,
			WildAsRank:       true,
			AllWildGroups:    false,
			MostlyWildGroups: false,
			WildJokerRanked:  false,
			SameSuitRuns:     false,
			AceHigh:          true,
			AceLow:           true,
			RunsWrap:         true,
		},
		Entries: []HandEntry{
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, QueenRank},
					Card{0, NoneSuit, JokerRank},
					Card{0, SpadesSuit, AceRank},
				},
				IsRun:  true,
				IsKind: false,
			},
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, QueenRank},
					Card{0, NoneSuit, JokerRank},
					Card{0, SpadesSuit, AceRank},
					Card{0, SpadesSuit, TwoRank},
				},
				IsRun:  true,
				IsKind: false,
			},
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, JackRank},
					Card{0, NoneSuit, JokerRank},
					Card{0, NoneSuit, JokerRank},
					Card{0, SpadesSuit, AceRank},
					Card{0, SpadesSuit, TwoRank},
				},
				IsRun:  true,
				IsKind: false,
			},
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, JackRank},
					Card{0, NoneSuit, JokerRank},
					Card{0, NoneSuit, JokerRank},
					Card{0, NoneSuit, JokerRank},
					Card{0, SpadesSuit, TwoRank},
				},
				IsRun:  true,
				IsKind: false,
			},
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, JackRank},
					Card{0, NoneSuit, JokerRank},
					Card{0, SpadesSuit, AceRank},
					Card{0, SpadesSuit, TwoRank},
				},
				IsRun:  false,
				IsKind: false,
			},
		},
	},
	ValidGroupEntry{
		Solver: GinSolver{
			PointValue:       DefaultPointValue,
			WildCards:        []CardRank{JokerRank, SevenRank},
			AnyWildGroup:     false,
			WildAsRank:       true,
			AllWildGroups:    true,
			MostlyWildGroups: true,
			WildJokerRanked:  false,
			SameSuitRuns:     true,
			AceHigh:          true,
			AceLow:           true,
			RunsWrap:         true,
		},
		Entries: []HandEntry{
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, AceRank},
					Card{0, SpadesSuit, QueenRank},
					Card{0, NoneSuit, JokerRank},
				},
				IsRun:  true,
				IsKind: false,
			},
		},
	},
}

func TestIsValidGroup(t *testing.T) {
	for _, more := range MoreCases {
		TestCases = append(TestCases, more...)
	}

	for _, tc := range TestCases {
		for _, entry := range tc.Entries {
			hand := entry.Hand
			cards := make([]int, len(hand))
			for index := range hand {
				cards[index] = index
			}
			actual_group := (&tc.Solver).IsValidGroup(hand, cards)
			actual_run := (&tc.Solver).IsRun(hand, cards)
			actual_kind := (&tc.Solver).IsKind(hand, cards)

			if actual_group != (entry.IsRun || entry.IsKind) || actual_run != entry.IsRun || actual_kind != entry.IsKind {
				t.Fatal("ERROR Expected:", entry.IsRun || entry.IsKind, entry.IsRun, entry.IsKind, "got:", actual_group, actual_run, actual_kind, "\nfor hand\n", hand, "\nand solver\n", tc.Solver)
			}
		}
	}
}
