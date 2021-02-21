package games

import (
	"reflect"
	"sort"
	"testing"
)

type GroupEntry struct {
	Group  []Card
	IsRun  bool
	IsKind bool
}

type ValidGroupEntry struct {
	Solver  GinSolver
	Entries []GroupEntry
}

type HandEntry struct {
	Hand  []Card
	Score int
	Debug bool
}

type ValidHandEntry struct {
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

// Test one group across multiple GinSolver configurations,
// providing functions to verify isRun and isRank based on
// the particular GinSolver
func groupAcross(
	fields []GinSetter, df GinSolver, group []Card,
	isRun func(GinSolver) bool, isRank func(GinSolver) bool,
) []ValidGroupEntry {
	ret := make([]ValidGroupEntry, 0)
	for _, solver := range across(fields, df) {
		ret = append(ret, ValidGroupEntry{
			Solver: solver,
			Entries: []GroupEntry{
				GroupEntry{
					Group:  group,
					IsRun:  isRun(solver),
					IsKind: isRank(solver),
				},
			},
		})
	}
	return ret
}

// Test multiple groups across GinSolver configurations
func groupsAcross(
	fields []GinSetter, df GinSolver, groups [][]Card,
	isRun func([]Card, GinSolver) bool, isRank func([]Card, GinSolver) bool,
) []ValidGroupEntry {
	ret := make([]ValidGroupEntry, 0)
	for _, group := range groups {
		ret = append(ret, groupAcross(fields,
			df,
			group,
			func(gs GinSolver) bool {
				return isRun(group, gs)
			},
			func(gs GinSolver) bool {
				return isRank(group, gs)
			},
		)...)
	}
	return ret
}

var MoreGroupCases = [][]ValidGroupEntry{
	groupAcross(
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
	groupAcross(
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
	groupAcross(
		allOptions, defaultSolver,
		[]Card{
			Card{0, NoneSuit, JokerRank},
			Card{0, NoneSuit, JokerRank},
			Card{0, NoneSuit, JokerRank},
		},
		func(gs GinSolver) bool {
			return gs.AllWildGroups
		},
		func(gs GinSolver) bool {
			return gs.AllWildGroups
		},
	),
	groupsAcross(
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
		func(group []Card, gs GinSolver) bool {
			if len(group) < 3 {
				return false
			}
			fourWild := len(gs.WildCards) > 1
			return (gs.AllWildGroups && fourWild) ||
				(gs.MostlyWildGroups && (!fourWild || gs.WildAsRank))
		},
		func(group []Card, gs GinSolver) bool {
			if len(group) < 3 {
				return false
			}
			fourWild := len(gs.WildCards) > 1
			return (gs.AllWildGroups && fourWild) ||
				(gs.MostlyWildGroups && (!fourWild || gs.WildAsRank))
		},
	),
}

var GroupTestCases = []ValidGroupEntry{
	ValidGroupEntry{
		Solver: GinSolver{
			PointValue:       DefaultPointValue,
			WildCards:        []CardRank{JokerRank},
			WildAsRank:       true,
			AllWildGroups:    false,
			MostlyWildGroups: false,
			WildJokerRanked:  false,
			SameSuitRuns:     false,
			AceHigh:          false,
			AceLow:           true,
			RunsWrap:         false,
		},
		Entries: []GroupEntry{
			GroupEntry{
				Group: []Card{
					Card{0, SpadesSuit, FiveRank},
					Card{0, ClubsSuit, FourRank},
					Card{0, HeartsSuit, ThreeRank},
				},
				IsRun:  true,
				IsKind: false,
			},
			GroupEntry{
				Group: []Card{
					Card{0, SpadesSuit, FiveRank},
					Card{0, HeartsSuit, ThreeRank},
					Card{0, ClubsSuit, AceRank},
				},
				IsRun:  false,
				IsKind: false,
			},
			GroupEntry{
				Group: []Card{
					Card{0, SpadesSuit, FiveRank},
					Card{0, HeartsSuit, FiveRank},
					Card{0, ClubsSuit, FiveRank},
				},
				IsRun:  false,
				IsKind: true,
			},
			GroupEntry{
				Group: []Card{
					Card{0, SpadesSuit, FiveRank},
					Card{0, HeartsSuit, ThreeRank},
					Card{0, NoneSuit, JokerRank},
				},
				IsRun:  true,
				IsKind: false,
			},
			GroupEntry{
				Group: []Card{
					Card{0, SpadesSuit, FiveRank},
					Card{0, HeartsSuit, FourRank},
					Card{0, NoneSuit, JokerRank},
				},
				IsRun:  true,
				IsKind: false,
			},
			GroupEntry{
				Group: []Card{
					Card{0, SpadesSuit, FiveRank},
					Card{0, HeartsSuit, FourRank},
					Card{0, NoneSuit, JokerRank},
					Card{0, NoneSuit, JokerRank},
				},
				IsRun:  true,
				IsKind: false,
			},
			GroupEntry{
				Group: []Card{
					Card{0, SpadesSuit, ThreeRank},
					Card{0, HeartsSuit, TwoRank},
					Card{0, NoneSuit, JokerRank},
					Card{0, NoneSuit, JokerRank},
				},
				IsRun:  true,
				IsKind: false,
			},
			GroupEntry{
				Group: []Card{
					Card{0, SpadesSuit, FiveRank},
					Card{0, HeartsSuit, FourRank},
					Card{0, NoneSuit, JokerRank},
					Card{0, NoneSuit, JokerRank},
					Card{0, NoneSuit, JokerRank},
				},
				IsRun:  false,
				IsKind: false,
			},
			GroupEntry{
				Group: []Card{
					Card{0, SpadesSuit, FiveRank},
					Card{0, SpadesSuit, ThreeRank},
					Card{0, NoneSuit, JokerRank},
				},
				IsRun:  true,
				IsKind: false,
			},
			GroupEntry{
				Group: []Card{
					Card{0, SpadesSuit, FiveRank},
					Card{0, HeartsSuit, FiveRank},
					Card{0, NoneSuit, JokerRank},
				},
				IsRun:  false,
				IsKind: true,
			},
			GroupEntry{
				Group: []Card{
					Card{0, SpadesSuit, KingRank},
					Card{0, HeartsSuit, AceRank},
					Card{0, NoneSuit, JokerRank},
				},
				IsRun:  false,
				IsKind: false,
			},
			GroupEntry{
				Group: []Card{
					Card{0, SpadesSuit, KingRank},
					Card{0, HeartsSuit, QueenRank},
					Card{0, NoneSuit, JokerRank},
				},
				IsRun:  true,
				IsKind: false,
			},
			GroupEntry{
				Group: []Card{
					Card{0, SpadesSuit, KingRank},
					Card{0, HeartsSuit, JackRank},
					Card{0, NoneSuit, JokerRank},
				},
				IsRun:  true,
				IsKind: false,
			},
			GroupEntry{
				Group: []Card{
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
			GroupEntry{
				Group: []Card{
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
			GroupEntry{
				Group: []Card{
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
			GroupEntry{
				Group: []Card{
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
			GroupEntry{
				Group: []Card{
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
			GroupEntry{
				Group: []Card{
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
			GroupEntry{
				Group: []Card{
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
			WildAsRank:       true,
			AllWildGroups:    true,
			MostlyWildGroups: false,
			WildJokerRanked:  false,
			SameSuitRuns:     true,
			AceHigh:          false,
			AceLow:           true,
			RunsWrap:         false,
		},
		Entries: []GroupEntry{
			GroupEntry{
				Group: []Card{
					Card{0, SpadesSuit, FiveRank},
					Card{0, ClubsSuit, FourRank},
					Card{0, HeartsSuit, ThreeRank},
				},
				IsRun:  false,
				IsKind: false,
			},
			GroupEntry{
				Group: []Card{
					Card{0, SpadesSuit, FiveRank},
					Card{0, SpadesSuit, FourRank},
					Card{0, SpadesSuit, ThreeRank},
				},
				IsRun:  true,
				IsKind: false,
			},
			GroupEntry{
				Group: []Card{
					Card{0, SpadesSuit, SevenRank},
					Card{0, HeartsSuit, SevenRank},
					Card{0, DiamondsSuit, SevenRank},
					Card{0, SpadesSuit, SevenRank},
				},
				IsRun:  true,
				IsKind: true,
			},
			GroupEntry{
				Group: []Card{
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
			WildAsRank:       true,
			AllWildGroups:    false,
			MostlyWildGroups: false,
			WildJokerRanked:  false,
			SameSuitRuns:     true,
			AceHigh:          true,
			AceLow:           true,
			RunsWrap:         false,
		},
		Entries: []GroupEntry{
			GroupEntry{
				Group: []Card{
					Card{0, SpadesSuit, FiveRank},
					Card{0, ClubsSuit, FourRank},
					Card{0, HeartsSuit, ThreeRank},
				},
				IsRun:  false,
				IsKind: false,
			},
			GroupEntry{
				Group: []Card{
					Card{0, SpadesSuit, FiveRank},
					Card{0, SpadesSuit, FourRank},
					Card{0, SpadesSuit, ThreeRank},
				},
				IsRun:  true,
				IsKind: false,
			},
			GroupEntry{
				Group: []Card{
					Card{0, SpadesSuit, QueenRank},
					Card{0, NoneSuit, JokerRank},
					Card{0, SpadesSuit, AceRank},
				},
				IsRun:  true,
				IsKind: false,
			},
			GroupEntry{
				Group: []Card{
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
			WildAsRank:       true,
			AllWildGroups:    false,
			MostlyWildGroups: false,
			WildJokerRanked:  false,
			SameSuitRuns:     false,
			AceHigh:          true,
			AceLow:           true,
			RunsWrap:         true,
		},
		Entries: []GroupEntry{
			GroupEntry{
				Group: []Card{
					Card{0, SpadesSuit, QueenRank},
					Card{0, NoneSuit, JokerRank},
					Card{0, SpadesSuit, AceRank},
				},
				IsRun:  true,
				IsKind: false,
			},
			GroupEntry{
				Group: []Card{
					Card{0, SpadesSuit, QueenRank},
					Card{0, NoneSuit, JokerRank},
					Card{0, SpadesSuit, AceRank},
					Card{0, SpadesSuit, TwoRank},
				},
				IsRun:  true,
				IsKind: false,
			},
			GroupEntry{
				Group: []Card{
					Card{0, SpadesSuit, JackRank},
					Card{0, NoneSuit, JokerRank},
					Card{0, NoneSuit, JokerRank},
					Card{0, SpadesSuit, AceRank},
					Card{0, SpadesSuit, TwoRank},
				},
				IsRun:  true,
				IsKind: false,
			},
			GroupEntry{
				Group: []Card{
					Card{0, SpadesSuit, JackRank},
					Card{0, NoneSuit, JokerRank},
					Card{0, NoneSuit, JokerRank},
					Card{0, NoneSuit, JokerRank},
					Card{0, SpadesSuit, TwoRank},
				},
				IsRun:  true,
				IsKind: false,
			},
			GroupEntry{
				Group: []Card{
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
			WildAsRank:       true,
			AllWildGroups:    true,
			MostlyWildGroups: true,
			WildJokerRanked:  false,
			SameSuitRuns:     true,
			AceHigh:          true,
			AceLow:           true,
			RunsWrap:         true,
		},
		Entries: []GroupEntry{
			GroupEntry{
				Group: []Card{
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

var someSolver = GinSolver{
	PointValue:       DefaultPointValue,
	WildCards:        []CardRank{JokerRank},
	WildAsRank:       true,
	AllWildGroups:    true,
	MostlyWildGroups: true,
	WildJokerRanked:  false,
	SameSuitRuns:     true,
	AceHigh:          false,
	AceLow:           false,
	RunsWrap:         false,
}

func threeThirteenSolver(round CardRank) GinSolver {
	return GinSolver{
		PointValue:       DefaultPointValue,
		WildCards:        []CardRank{JokerRank, round},
		WildAsRank:       true,
		AllWildGroups:    false,
		MostlyWildGroups: false,
		WildJokerRanked:  false,
		SameSuitRuns:     true,
		AceHigh:          false,
		AceLow:           false,
		RunsWrap:         false,
	}
}

var HandTestCases = []ValidHandEntry{
	ValidHandEntry{
		Solver: threeThirteenSolver(QueenRank),
		Entries: []HandEntry{
			HandEntry{
				Hand: []Card{
					Card{13, ClubsSuit, 4},
					Card{48, ClubsSuit, 3},
					Card{20, ClubsSuit, 2},

					Card{44, ClubsSuit, 13},
					Card{23, SpadesSuit, 12},
					Card{27, FancySuit, 14},
					Card{53, ClubsSuit, 10},
					Card{29, ClubsSuit, 9},
					Card{28, ClubsSuit, 8},

					Card{51, FancySuit, 14},
					Card{24, SpadesSuit, 1},
					Card{32, DiamondsSuit, 1},
				},
				Score: 0,
			},
			HandEntry{
				Hand: []Card{
					Card{44, ClubsSuit, 13},
					Card{23, SpadesSuit, 12},
					Card{27, FancySuit, 14},
					Card{53, ClubsSuit, 10},
					Card{29, ClubsSuit, 9},
					Card{28, ClubsSuit, 8},
				},
				Score: 0,
			},
			HandEntry{
				Hand: []Card{
					Card{13, ClubsSuit, 4},
					Card{48, ClubsSuit, 3},
					Card{20, ClubsSuit, 2},

					Card{44, ClubsSuit, 13},
					Card{23, SpadesSuit, 12},
					Card{27, FancySuit, 14},
					Card{53, ClubsSuit, 10},
					Card{29, ClubsSuit, 9},
					Card{28, ClubsSuit, 8},

					Card{51, FancySuit, 14},
					Card{24, SpadesSuit, 2},
					Card{32, SpadesSuit, 1},
				},
				Score: 0,
			},
			HandEntry{
				Hand: []Card{
					Card{13, ClubsSuit, 4},
					Card{48, ClubsSuit, 3},
					Card{20, ClubsSuit, 2},

					Card{44, ClubsSuit, 13},
					Card{23, SpadesSuit, 12},
					Card{27, FancySuit, 14},
					Card{53, ClubsSuit, 10},
					Card{29, ClubsSuit, 9},
					Card{28, ClubsSuit, 8},
				},
				Score: 0,
			},
			HandEntry{
				Hand: []Card{
					Card{13, ClubsSuit, 4},
					Card{48, ClubsSuit, 3},
					Card{20, ClubsSuit, 2},

					Card{44, ClubsSuit, 13},
					Card{23, SpadesSuit, 12},
					Card{27, FancySuit, 14},
					Card{53, ClubsSuit, 10},
					Card{29, ClubsSuit, 9},
					Card{28, ClubsSuit, 8},

					Card{51, FancySuit, 14},
				},
				Score: 0,
			},
			HandEntry{
				Hand: []Card{
					Card{13, ClubsSuit, 4},
					Card{48, ClubsSuit, 3},
					Card{20, ClubsSuit, 2},

					Card{44, ClubsSuit, 13},
					Card{23, SpadesSuit, 12},
					Card{27, FancySuit, 14},
					Card{53, ClubsSuit, 10},
					Card{29, ClubsSuit, 9},
					Card{28, ClubsSuit, 8},

					Card{51, FancySuit, 14},
					Card{25, SpadesSuit, 3},
					Card{24, SpadesSuit, 2},
					Card{32, SpadesSuit, 1},
				},
				Score: 0,
			},
		},
	},
	ValidHandEntry{
		Solver: threeThirteenSolver(KingRank),
		Entries: []HandEntry{
			HandEntry{
				Hand: []Card{
					Card{24, ClubsSuit, ThreeRank},
					Card{12, HeartsSuit, ThreeRank},
					Card{25, HeartsSuit, KingRank},

					Card{26, ClubsSuit, NineRank},
					Card{38, SpadesSuit, KingRank},
					Card{46, ClubsSuit, SevenRank},

					Card{18, DiamondsSuit, QueenRank},
					Card{31, SpadesSuit, QueenRank},
					Card{43, ClubsSuit, QueenRank},
					Card{19, HeartsSuit, QueenRank},

					Card{23, SpadesSuit, AceRank},
					Card{1, DiamondsSuit, AceRank},
					Card{30, HeartsSuit, AceRank},
				},
				Score: 0,
			},
		},
	},
	ValidHandEntry{
		Solver: someSolver,
		Entries: []HandEntry{
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, JackRank},
					Card{0, NoneSuit, JokerRank},
					Card{0, SpadesSuit, KingRank},
				},
				Score: 0,
			},
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, JackRank},
					Card{0, SpadesSuit, QueenRank},
					Card{0, SpadesSuit, KingRank},
				},
				Score: 0,
			},
			HandEntry{
				Hand: []Card{
					Card{0, NoneSuit, ThreeRank},
					Card{0, SpadesSuit, ThreeRank},
					Card{0, HeartsSuit, ThreeRank},
				},
				Score: 0,
			},
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, JackRank},
					Card{0, SpadesSuit, QueenRank},
					Card{0, SpadesSuit, KingRank},
					Card{0, DiamondsSuit, ThreeRank},
					Card{0, SpadesSuit, ThreeRank},
					Card{0, HeartsSuit, ThreeRank},
				},
				Score: 0,
			},
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, JackRank},
					Card{0, SpadesSuit, QueenRank},
					Card{0, SpadesSuit, KingRank},
					Card{0, DiamondsSuit, ThreeRank},
				},
				Score: 3,
			},
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, JackRank},
					Card{0, SpadesSuit, QueenRank},
					Card{0, SpadesSuit, KingRank},
					Card{0, DiamondsSuit, TenRank},
					Card{0, DiamondsSuit, NineRank},
					Card{0, DiamondsSuit, EightRank},
				},
				Score: 0,
			},
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, JackRank},
					Card{0, SpadesSuit, QueenRank},
					Card{0, SpadesSuit, KingRank},
					Card{0, DiamondsSuit, NineRank},
					Card{0, DiamondsSuit, EightRank},
				},
				Score: 17,
			},
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, JackRank},
					Card{0, SpadesSuit, QueenRank},
					Card{0, NoneSuit, JokerRank},
					Card{0, DiamondsSuit, NineRank},
					Card{0, DiamondsSuit, EightRank},
				},
				Score: 17,
			},
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, JackRank},
					Card{0, SpadesSuit, QueenRank},
					Card{0, NoneSuit, JokerRank},
					Card{0, DiamondsSuit, QueenRank},
				},
				Score: 11,
			},
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, JackRank},
					Card{0, DiamondsSuit, QueenRank},
					Card{0, NoneSuit, JokerRank},
				},
				Score: 43,
			},
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, AceRank},
					Card{0, SpadesSuit, TwoRank},
					Card{0, NoneSuit, JokerRank},
					Card{0, SpadesSuit, FourRank},
					Card{0, HeartsSuit, FourRank},
					Card{0, SpadesSuit, FiveRank},
				},
				Score: 4,
			},
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, AceRank},
					Card{0, SpadesSuit, TwoRank},
					Card{0, NoneSuit, JokerRank},
					Card{0, SpadesSuit, FourRank},
					Card{0, HeartsSuit, FourRank},
					Card{0, ClubsSuit, FourRank},
					Card{0, SpadesSuit, FiveRank},
				},
				Score: 5,
			},
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, TwoRank},
					Card{0, NoneSuit, JokerRank},
					Card{0, SpadesSuit, FourRank},
					Card{0, HeartsSuit, FourRank},
					Card{0, ClubsSuit, FourRank},
					Card{0, SpadesSuit, FiveRank},
				},
				Score: 7,
			},
		},
	},
}

func TestIsValidGroup(t *testing.T) {
	for _, more := range MoreGroupCases {
		GroupTestCases = append(GroupTestCases, more...)
	}

	// ls pkg/games/* | entr env GOROOT="" go test -v -count=1 -run TestIsValidGroup git.cipherboy.com/WillowPatchGames/wpg/pkg/games

	// base_groups [[13 18 11] [14 17 10] [12 15 16]] hand [Card{42, ClubsSuit, FourRank} Card{17, SpadesSuit, AceRank} Card{38, DiamondsSuit, TenRank} Card{36, SpadesSuit, QueenRank} Card{30, ClubsSuit, ThreeRank} Card{23, DiamondsSuit, SixRank} Card{28, DiamondsSuit, AceRank} Card{26, SpadesSuit, JackRank} Card{9, DiamondsSuit, JackRank} Card{32, SpadesSuit, KingRank} Card{40, DiamondsSuit, SevenRank} Card{22, SpadesSuit, SixRank} Card{25, SpadesSuit, NineRank} Card{45, ClubsSuit, SixRank} Card{53, ClubsSuit, SevenRank} Card{50, HeartsSuit, NineRank} Card{29, FancySuit, JokerRank} Card{27, SpadesSuit, SevenRank} Card{51, HeartsSuit, SixRank}] groups [[45 51 22] [53 27 40] [25 50 29]]
	base_groups := [][]int{[]int{13, 18, 11}, []int{14, 17, 10}, []int{12, 15, 16}}
	hand := []Card{
		Card{42, ClubsSuit, FourRank},
		Card{17, SpadesSuit, AceRank},
		Card{38, DiamondsSuit, TenRank},
		Card{36, SpadesSuit, QueenRank}, //
		Card{30, ClubsSuit, ThreeRank},
		Card{23, DiamondsSuit, SixRank}, //
		Card{28, DiamondsSuit, AceRank},
		Card{26, SpadesSuit, JackRank}, //
		Card{9, DiamondsSuit, JackRank},
		Card{32, SpadesSuit, KingRank},    //
		Card{40, DiamondsSuit, SevenRank}, // 10
		Card{22, SpadesSuit, SixRank},     // 11
		Card{25, SpadesSuit, NineRank},    // 12
		Card{45, ClubsSuit, SixRank},      // 13
		Card{53, ClubsSuit, SevenRank},    // 14
		Card{50, HeartsSuit, NineRank},    // 15
		Card{29, FancySuit, JokerRank},    // 16
		Card{27, SpadesSuit, SevenRank},   // 17
		Card{51, HeartsSuit, SixRank},     // 18
	}
	t.Log("min score", defaultSolver.MinScoreBelowUsing(hand, 99, base_groups))
	for _, tc := range GroupTestCases {
		for _, entry := range tc.Entries {
			group := entry.Group
			cards := make([]int, len(group))
			for index := range group {
				cards[index] = index
			}
			actual_group := (&tc.Solver).IsValidGroup(group, cards)
			actual_run := (&tc.Solver).IsRun(group, cards)
			actual_kind := (&tc.Solver).IsKind(group, cards)

			if actual_group != (entry.IsRun || entry.IsKind) || actual_run != entry.IsRun || actual_kind != entry.IsKind {
				t.Error("ERROR Expected:", entry.IsRun || entry.IsKind, entry.IsRun, entry.IsKind, "got:", actual_group, actual_run, actual_kind, "\nfor group\n", group, "\nand solver\n", tc.Solver)
			}
			actual_score := (&tc.Solver).MinScoreBelow(group, 100)
			if (entry.IsRun || entry.IsKind) == (actual_score != 0) {
				if len(group) > 10 {
					continue
				}
				//m := (&tc.Solver).AllMatches(group, cards)
				//if len(m) < 12 {
				//	t.Log("All matches", m)
				//}
				t.Log("Mostly", tc.Solver.MostlyWildGroups, "all", tc.Solver.AllWildGroups)
				t.Error("ERROR Expected:", (entry.IsRun || entry.IsKind), "got:", actual_score, "\nfor group\n", group, "\nand solver\n", tc.Solver)
			}
		}
	}
	for _, tc := range HandTestCases {
		for _, entry := range tc.Entries {
			group := entry.Hand
			cards := make([]int, len(group))
			regular := make([]int, 0, len(group))
			for index, card := range group {
				cards[index] = index
				if !(&tc.Solver).IsWildCard(card) {
					regular = append(regular, index)
				}
			}
			wc := len(cards) - len(regular)

			actual_score := (&tc.Solver).MinScore(group)

			if actual_score != entry.Score {
				t.Log("Regular", regular)

				sorted := make([]Card, len(regular))
				for i, index := range regular {
					sorted[i] = group[index]
				}
				sort.SliceStable(sorted, func(i, j int) bool {
					return sorted[i].Rank < sorted[j].Rank
				})
				t.Log("Divided", (&tc.Solver).DivideHandBy(sorted, wc))

				m1 := (&tc.Solver).AllMatches(group, regular)
				m2 := make([]Match, 0)
				for _, m := range m1 {
					found := false
					for _, m_ := range m2 {
						if reflect.DeepEqual(m, m_) {
							found = true
							break
						}
					}
					if !found && m.wc.min <= wc {
						m2 = append(m2, m)
					}
				}
				sort.SliceStable(m2, func(i, j int) bool {
					return m2[i].cost > m2[j].cost
				})
				if len(m2) < 40 {
					t.Log("All matches", m2)
				}

				m3 := maximalMatchesLessThanWithout(m2, make(map[int]bool), wc)
				m4 := make([]Match, 0, len(m3))
				for _, m := range m3 {
					found := false
					for _, m_ := range m4 {
						if reflect.DeepEqual(m, m_) {
							found = true
							break
						}
					}
					if !found {
						m4 = append(m4, m)
					}
				}
				sort.SliceStable(m4, func(i, j int) bool {
					return m4[i].cost > m4[j].cost
				})
				if len(m4) < 160 {
					t.Log("maximal matches", m4)
				}

				t.Error("ERROR Expected:", entry.Score, "got:", actual_score, "\nfor group\n", entry.Hand, "\nand solver\n", tc.Solver)
			}
		}
	}
}
