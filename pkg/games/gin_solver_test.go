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
				IsGroup: true,
				IsRun:   true,
				IsKind:  false,
			},
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, FiveRank},
					Card{0, HeartsSuit, ThreeRank},
					Card{0, ClubsSuit, AceRank},
				},
				IsGroup: false,
				IsRun:   false,
				IsKind:  false,
			},
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, FiveRank},
					Card{0, HeartsSuit, FiveRank},
					Card{0, ClubsSuit, FiveRank},
				},
				IsGroup: true,
				IsRun:   false,
				IsKind:  true,
			},
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, FiveRank},
					Card{0, HeartsSuit, ThreeRank},
					Card{0, NoneSuit, JokerRank},
				},
				IsGroup: true,
				IsRun:   true,
				IsKind:  false,
			},
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, FiveRank},
					Card{0, HeartsSuit, FourRank},
					Card{0, NoneSuit, JokerRank},
				},
				IsGroup: true,
				IsRun:   true,
				IsKind:  false,
			},
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, FiveRank},
					Card{0, HeartsSuit, FourRank},
					Card{0, NoneSuit, JokerRank},
					Card{0, NoneSuit, JokerRank},
				},
				IsGroup: true,
				IsRun:   true,
				IsKind:  false,
			},
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, ThreeRank},
					Card{0, HeartsSuit, TwoRank},
					Card{0, NoneSuit, JokerRank},
					Card{0, NoneSuit, JokerRank},
				},
				IsGroup: true,
				IsRun:   true,
				IsKind:  false,
			},
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, FiveRank},
					Card{0, HeartsSuit, FourRank},
					Card{0, NoneSuit, JokerRank},
					Card{0, NoneSuit, JokerRank},
					Card{0, NoneSuit, JokerRank},
				},
				IsGroup: false,
				IsRun:   false,
				IsKind:  false,
			},
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, FiveRank},
					Card{0, SpadesSuit, ThreeRank},
					Card{0, NoneSuit, JokerRank},
				},
				IsGroup: true,
				IsRun:   true,
				IsKind:  false,
			},
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, FiveRank},
					Card{0, HeartsSuit, FiveRank},
					Card{0, NoneSuit, JokerRank},
				},
				IsGroup: true,
				IsRun:   false,
				IsKind:  true,
			},
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, KingRank},
					Card{0, HeartsSuit, AceRank},
					Card{0, NoneSuit, JokerRank},
				},
				IsGroup: false,
				IsRun:   false,
				IsKind:  false,
			},
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, KingRank},
					Card{0, HeartsSuit, QueenRank},
					Card{0, NoneSuit, JokerRank},
				},
				IsGroup: true,
				IsRun:   true,
				IsKind:  false,
			},
			HandEntry{
				Hand: []Card{
					Card{0, SpadesSuit, KingRank},
					Card{0, HeartsSuit, JackRank},
					Card{0, NoneSuit, JokerRank},
				},
				IsGroup: true,
				IsRun:   true,
				IsKind:  false,
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
				IsGroup: true,
				IsRun:   true,
				IsKind:  false,
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
				IsGroup: false,
				IsRun:   false,
				IsKind:  false,
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
				IsGroup: true,
				IsRun:   true,
				IsKind:  false,
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
				IsGroup: true,
				IsRun:   true,
				IsKind:  false,
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
				IsGroup: true,
				IsRun:   true,
				IsKind:  false,
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
				IsGroup: false,
				IsRun:   false,
				IsKind:  false,
			},
		},
	},
}

func TestIsValidGroup(t *testing.T) {
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

			if actual_group != entry.IsGroup || actual_run != entry.IsRun || actual_kind != entry.IsKind {
				t.Fatal("Test case differs from expectations:", entry.IsGroup, entry.IsRun, entry.IsKind, "versus", actual_group, actual_run, actual_kind, "for hand", hand)
			}
		}
	}
}
