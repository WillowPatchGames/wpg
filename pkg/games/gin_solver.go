package games

import (
	"sort"
	"strconv"
)

type LRUHandCache struct {
	efficiency float64
	entries    map[[]Card]int
}

type GinSolver struct {
	PointValue map[CardRank]int `json:"point_value"`
	WildCards  []CardRank       `json:"wild_cards"`

	MostlyWildGroups bool `json:"mostly_wild_groups"`
	AllWildGroups    bool `json:"all_wild_groups"`
	WildAsRank       bool `json:"wild_as_rank"`

	SameSuitRuns bool `json:"same_suit_runs"`
	AceHigh      bool `json:"ace_high"`
	AceLow       bool `json:"ace_low"`
	RunsWrap     bool `json:"runs_wrap"`
}

// Maps a hand of cards to their face values.
func (gs *GinSolver) HandToValues(hand []Card) []int {
	var result = make([]int, len(hand))
	for index, card := range hand {
		result[index] = gs.PointValue[card]
	}
	return result
}

// Checks whether individual cards in a set of cards can sum to a particular
// value, independent of grouping.
func (gs *GinSolver) SubsetSum(hand []int, sum int) bool {
	// Zero sum is trivial: no cards.
	if sum == 0 {
		return true
	}

	// If we have a single element, check it first.
	if len(hand) == 1 && hand[0] != sum {
		return false
	}

	// Copy over our elements in our hand...
	var elements = make([]int, len(hand))
	copy(elements, hand)

	// Heuristic: sort the hand if we need to satisfy a small score. In this
	// case, we likely won't need large elements and so will exit early.
	if sum < 20 {
		sort.Ints(elements)

		// Edge case: smallest element is the sum; return it.
		if elements[0] == sum {
			return true
		}

		// Edge case: smallest element is greater than the sum; not possible to
		// make the sum.
		if elements[0] > sum {
			return false
		}
	}

	// Begin Dynamic Programming solution.
	//
	// Loosely modeled from http://www.cs.utsa.edu/~wagner/CS3343/ss/ss.html.
	//
	// Build an array of possible sum made from elements of the hand. At
	// position j, such a sum (j) is possible if and only if data[j] == true.
	// Hence, index 0 is possible, because we can use zero elements to create the
	// zero sum.
	var data []bool = make([]bool, sum+1)
	data[0] = true

	// At each step, take a new element out of the array. To any existing sum
	// that's possible, mark (sum + element) as possible.
	for element_index := range elements {
		var element = elements[element_index]

		// Skip any zero elements.
		if element == 0 {
			continue
		}

		// Edge case: element is exactly the sum; return true.
		if element == sum {
			return true
		}

		// n.b.: Unlike the solution given at the link above, we're doing two
		// things differently:
		//
		// 1. We're using a boolean array. We don't care if an element is used more
		//    than once, if it is present in the hand more than once.
		// 2. We're making a copy so we can detect the edge case above again.
		//
		// Notably, because the solution on the above website is in-place, it
		// requires writing the last value to the index in order to prevent
		// multiples of the same value showing up. Here however, we make a copy,
		// reading from the original and writing to the copy. This prevents us from
		// using multiples of a value which doesn't have multiples in the original
		// hand, while allowing us to use multiples of a value which does have
		// multiples in the original hand.
		//
		// We hope that sum is sufficiently small, that we
		var new_data []bool = make([]bool, len(data))
		copy(new_data, data)

		for is_existing_sum := range data {
			// If we can't make this existing sum, we can't make (element + existing)
			if !data[is_existing_sum] {
				continue
			}

			// Edge case: matches the sum, exit early.
			if (is_existing_sum + element) == sum {
				return true
			}

			// Prevent OOB.
			if (is_existing_sum + element) > sum {
				break
			}

			new_data[is_existing_sum+element] = true
		}

		data = new_data
	}

	return data[sum]
}

func sum(data []int) int {
	var result = 0
	for _, value := range data {
		result += value
	}
	return result
}

// Datatype for recursive descent searches.
type GinSolverDescentState struct {
	// Group Assignments:
	//  - GroupAssignment[i] == 0 <==> hand[i] isn't part of a group.
	//  - GroupAssignments[i] = k > 0 <==> hand[i] is part of group k.
	GroupAssignments []int

	// Whether to look at 5-wide groups.
	LookFives bool

	// Whether to look at 4-wide groups.
	LookFours bool

	// Whether to look at 3-wide groups.
	LookThrees bool

	// Largest set value. Starts at 0, meaning our first set will be 1.
	LastSet int

	// Indices into the hand array. Used for incrementing through stuff and
	// knowing where to
	A int
	B int
	C int
	D int
	E int
}

func (gs *GinSolver) UnmatchedSum(state GinSolverDescentState, values []int) int {
	var result = 0
	for index, group := range state.GroupAssignment {
		if group == 0 {
			result += values[index]
		}
	}
	return result
}

// Partition a sorted hand into unique regions. Each index is the end (not
// inclusive). The last index is explicitly included. If the delta between
// two cards is more than one (e.g., Two and Four of Clubs), the hand is
// considered partitioned. Notably, without wild cards, two disjoint
// partitions may not be joined.
//
// Precondition: hand is already sorted. Otherwise, partitions wouldn't
// make sense.
func (gs *GinSolver) DivideHand(hand []Card) []int {
	var partitions []int

	for index := 1; index < len(hand); index++ {
		var last_card = hand[index-1]
		var this_card = hand[index]
		if int(last_card.Rank) + 1 < int(this_card.Rank) {
			// Partition after last_card, but before this card.
			partitions = append(partitions, index)
		}
	}

	// Make sure the length is present. This ensures we stop the partition.
	partitions = append(partitions, len(hand))

	return partitions
}

// Checks whether the given hand can make the score entered by the user. This
// score may not be the most optimal, but it is the one they chose.
func (gs *GinSolver) CanMakeScore(hand []Card, score int) bool {
	// Before beginning, sort the cards in the hand from highest to lowest,
	// removing any wild cards before we begin. We sort purely by rank, in
	// reverse.
	var wilds = make([]Card, 0)
	var ranked = make([]Card, 0)

	for _, card := range hand {
		found := false
		for _, wild := range gs.WildCards {
			if card.Rank == wild {
				wilds = append(wilds, card)
				found = true
				break
			}
		}

		if !found {
			ranked = append(ranked, card)
		}
	}

	// Sort all the cards. This allows us to put Jokers ahead of other
	// wild cards. Notably, we want to sort in reversed order (hence,
	// define our less function as a more function.
	sort.SliceStable(hand, func(i, j int) bool {
		return hand[i].Rank > hand[j].Rank
	})
	sort.SliceStable(wilds, func(i, j int) bool {
		return wilds[i].Rank > wilds[j].Rank
	})
	sort.SliceStable(ranked, func(i, j int) bool {
		return ranked[i].Rank > ranked[j].Rank
	})

	// Convert cards to integer point values.
	hand_values := gs.HandToValues(hand)
	wilds_values := gs.HandToValues(wilds)
	ranked_values := gs.HandToValues(ranked)

	// Edge cases: If all the values can't sum to the score, we'll never be able
	// to make the score. Exit early.
	if sum(hand_values) < score {
		return false
	}

	// Edge case: if we exactly match the sum, it means there are no groups and
	// we can exit early.
	if sum(hand_values) == score {
		return true
	}

	// If any set of individual cards cannot sum to the value, we won't be able
	// to make this value. Exit early. This step is O(|hand| * sum).
	if !gs.SubsetSum(hand_values, score) {
		return false
	}

	// We know we're guaranteed to be able to make a subset equal to the score.
	// The question now is, whether this is possible while satisfying that all
	// other cards are in groups. Note that groups of 6 are trivially possible as
	// two groups of three; we just have to find the right two groups of three.
	//
	// Use a divide and conquer algorithm. Divide into separate partitions,
	// merge if possible (using wilds), and see if the remainder ever equals
	// our target sum.
	var states []DescentState = make([]DescentState, 1)
	states[0].GroupAssignments = make([]int, len(hand))
	states[0].LookFives = len(hand) >= 5
	states[0].LookFours = len(hand) >= 4
	states[0].LookThrees = len(hand) >= 3
	states[0].A = 0
	states[0].B = 1
	states[0].C = 2
	states[0].D = 3
	states[0].E = 4

	// Divide the sorted, ranked cards into partitions of group candidates.
	// Notably, without wild cards, no grouping can cross a gap of two ranks.
	// However, with wild cards, we can merge across groups.
	var ranked_partitions = gs.DivideHand(ranked)

	// Precondition: pointers are valid; group assignments are valid;
	for len(states) > 0 && states[0].LookThrees {
		state_index := len(state) - 1

		if UnmatchedSum(states[0]) == sum {
			return true
		}
	}

	return false
}

func (gs *GinSolver) ComputeMinScore(hand []Card) int {

}
