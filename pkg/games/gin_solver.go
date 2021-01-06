package games

import (
	"sort"
)

type GinSolver struct {
	PointValue map[CardRank]int `json:"point_value"`
	WildCards  []CardRank       `json:"wild_cards"`

	// The order of precedence is:
	//
	// 1. AnyWildGroup
	// 2. AllWildGroups
	// 3. WildAsRank
	// 4. MostlyWildGroups
	//
	// Concretely, AnyWildGroup means that any grouping of cards that includes
	// one or more wild card can be considered a valid group, assuming there is
	// a valid value for that wild card that completes the group. This is the
	// most greedy pattern: all (valid) combinations of any wild cards and ranked
	// cards are permitted.
	//
	// Next, AllWildGroups allows any combination of all wild cards as allowed.
	// This means that four Jokers would be considered an allowed group, even if
	// MostlyWildGroups was false (leading to, for example, three Jokers and an
	// Ace being forbidden). Notably, if AnyWildGroup is false, mixed type wild
	// cards would then be forbidden, assuming WildAsRank also doesn't apply.
	//
	// Barring that, WildAsRank allows treating wild cards as their face rank,
	// when processing the remaining rules. That is, if you have the group
	// (4, 4, 4, Joker) when AllWildGroups and MostlyWildGroups are false (and
	// further, that both 4s and Jokers are wild), then this would be permitted,
	// as the wild 4s can take their face value (as 4s) and the remaining wild
	// cards (Jokers) are now in the minority.
	//
	// Finally, the value of MostlyWildGroups is observed. When this value is
	// false, wild cards must comprise half or less of the grouping. Otherwise,
	// they can comprise more than half.
	AnyWildGroup     bool `json:"any_wild_group"`
	WildAsRank       bool `json:"wild_as_rank"`
	AllWildGroups    bool `json:"all_wild_groups"`
	MostlyWildGroups bool `json:"mostly_wild_groups"`

	WildJokerRanked bool `json:"wild_joker_rank"` // Whether wild Jokers can be used with WildAsRank
	SameSuitRuns    bool `json:"same_suit_runs"`
	AceHigh         bool `json:"ace_high"`
	AceLow          bool `json:"ace_low"`
	RunsWrap        bool `json:"runs_wrap"`
}

// Maps a hand of cards to their face values.
func (gs *GinSolver) HandToValues(hand []Card) []int {
	var result = make([]int, len(hand))
	for index, card := range hand {
		result[index] = gs.PointValue[card.Rank]
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

// Whether or not a card is a wild card, under the sole interpretation of the
// GinSolver state structure. That is, whether card is a member of gs.WildCards.
func (gs *GinSolver) IsWildRank(rank CardRank) bool {
	for _, wild := range gs.WildCards {
		if rank == wild {
			return true
		}
	}

	return false
}

// Whether or not a card is a wild card, under the sole interpretation of the
// GinSolver state structure. That is, whether card is a member of gs.WildCards.
func (gs *GinSolver) IsWildCard(card Card) bool {
	return gs.IsWildRank(card.Rank)
}

// Partition a sorted hand into unique regions. Each index is the end (not
// inclusive). The last index is explicitly included. If the delta between
// two cards is more than one (e.g., Two and Four of Clubs), the hand is
// considered partitioned. Notably, without wild cards, two disjoint
// partitions may not be joined by either kinds or runs.
//
// Precondition: hand is already sorted. Otherwise, these partitions wouldn't
// make any sense.
func (gs *GinSolver) DivideHand(hand []Card) []int {
	var partitions []int

	for index := 1; index < len(hand); index++ {
		var last_card = hand[index-1]
		var this_card = hand[index]
		if int(last_card.Rank)+1 < int(this_card.Rank) {
			// Partition after last_card, but before this card.
			partitions = append(partitions, index)
		}
	}

	// Make sure the length is present. This ensures we stop the partition.
	partitions = append(partitions, len(hand))

	return partitions
}

// Whether or not a group of cards (defined as a set of indices in the hand
// array) are valid. Notably, we assume in our solver that it doesn't matter
// _how_ groups are counted, only that they are counted. This means that, if
// we have only five cards (6 5 5 5 4 3) whereby either a run or a kind could
// be formed, we can do either. Because the logic in isKind is less expensive,
// we do it ahead of isRun.
func (gs *GinSolver) isValidGroup(hand []Card, cards []int) bool {
	// No valid group can only have 1 or 2 cards.
	if len(cards) < 3 {
		return false
	}

	return gs.isKind(hand, cards) || gs.isRun(hand, cards)
}

func (gs *GinSolver) isKind(hand []Card, cards []int) bool {
	// A grouping of a kind is valid IFF you have a single fixed point value
	// (here, `rank`), and other wild cards interspersed. We initialize it to
	// NoneRank to signify that a rank hasn't been found yet. The first visited
	// non-wild rank thus becomes a wild card. Additional conditions are
	// validated later, but if we encounter two non-wild cards of different
	// ranks, we can safely conclude that it is not a valid same-value grouping.
	rank := NoneRank
	num_wild := 0
	wild_ranks := make(map[CardRank]int)

	for _, hand_index := range cards {
		card := hand[hand_index]
		if gs.IsWildCard(card) {
			num_wild++
			wild_ranks[card.Rank] += 1
		} else if rank == NoneRank {
			// Update this because card isn't wild.
			rank = card.Rank
		} else if rank != card.Rank {
			// Because we only assign rank when the card isn't a wild card, and we've
			// already checked whether or not this card is a wild card, we know that
			// this card breaks a valid kind: it isn't the same rank as another
			// non-wild card.
			return false
		}
	}

	// We now have a single-rank (either NoneRank or a fixed value) and zero or
	// more wild cards. Order of operations thus matters here: if we don't allow
	// all-wild groups, we can't exit if we could allow it as a mostly-wild
	// group. So, check most restrictive to least-restrictive first.

	// First, we can exit early if we know we don't have any wild cards. This is
	// a trivial grouping. Second, we can exit early if any grouping of wild
	// cards is allowed.
	if num_wild == 0 || gs.AnyWildGroup {
		return true
	}

	// Notably, beyond this point, we now know we have at most one value for
	// ranked cards, plus a number of wild cards we're trying to coerce into
	// ranked cards. We're trying to do so without violating any other
	// mechanisms for organizing cards.

	// Thirdly, process AllWildGroups: if all the cards are wild, we know we have
	// a valid grouping.
	if num_wild == len(cards) && (!gs.AllWildGroups && !gs.WildAsRank) {
		return gs.AllWildGroups
	}

	// Fourthly, if we have WildAsRank, we should look and see if we can reduce
	// the number of wild cards by using a non-Joker wild card as a ranked
	// card.
	if gs.WildAsRank && rank == NoneRank {
		wild_jokers := gs.IsWildRank(JokerRank)
		most_wild_rank := NoneRank
		most_wild_count := 0
		for wild_rank, count := range wild_ranks {
			if count > most_wild_count && (wild_rank != JokerRank || !wild_jokers || gs.WildJokerRanked) {
				most_wild_rank = wild_rank
				most_wild_count = count
			}
		}
		rank = most_wild_rank
		num_wild -= most_wild_count
	}

	// Having made that adjustment, now apply MostlyWildGroups. We first need to
	//
	var majority = len(cards) / 2
	if majority+majority == len(cards) {
		majority += 1
	}
	if num_wild < majority || gs.MostlyWildGroups {
		return true
	}

	// We've tried all possible tricks up our sleeves to get some number of wild
	// cards wrangled into a single allowed, valid group. Sadly it just wasn't
	// possible.
	return false
}

func (gs *GinSolver) isRun(hand []Card, cards []int) bool {
	// A group of cards is a run IFF they have a designated start and end value,
	// where all ranks in the range are assigned, and optionally, follow a single
	// suit. To do so, we slot cards into a mapping, starting with non-wild cards.
	// Using the upper and lower bound on this mapping, we see if we can add in
	// wild cards to complete a valid range. Notably, unless WildJokerRanked is
	// set to true, the maximum value is a run is King, not Joker. Additionally,
	// we know that if two cards have the same rank, they cannot form a valid
	// run.
	var run_map map[CardRank]int
	var wild_cards []int
	var min_rank CardRank = NoneRank
	var max_rank CardRank = NoneRank
	var run_suit CardSuit = NoneSuit

	for index := NoneRank; index <= JokerRank; index++ {
		run_map[index] = -1
	}

	// Split off wild cards. Then slot in ranked cards, updating min and max
	// rank as appropriate.
	for _, hand_index := range cards {
		card := hand[hand_index]
		if gs.IsWildCard(card) {
			wild_cards = append(wild_cards, hand_index)
		} else if run_map[card.Rank] == -1 {
			run_map[card.Rank] = hand_index
			if min_rank == NoneRank || card.Rank < min_rank {
				min_rank = card.Rank
			}
			if max_rank == NoneRank || card.Rank > max_rank {
				max_rank = card.Rank
			}
			if run_suit == NoneSuit {
				run_suit = card.Suit
			} else if run_suit != card.Suit && gs.SameSuitRuns {
				// Here we found two ranked cards of different suits; this cannot be
				// a run due to config, so we can exit early.
				return false
			}
		} else {
			// The given card is ranked (not wild) and we know its rank is already
			// represented in the solver. This is more like a Kind than a Run: no
			// duplicates are allowed.
			return false
		}
	}

	// Before continuing, check if our bounds are useful. Notably, the following
	// are equivalent:
	//
	// 1. min_rank == NoneRank
	// 2. max_rank == NoneRank
	// 3. len(wild_cards) == len(cards)
	//
	// We put them into an or conditional to avoid any of them breaking later
	// assumptions.
	if min_rank == NoneRank || len(wild_cards) == len(cards) || max_rank == NoneRank {
		return gs.AnyWildGroup || gs.AllWildGroups
	}

	// If we have a single card and a bunch of wild cards, we can only be a valid
	// group IFF MostlyWildGroups is true, because we always have at least three
	// cards in a group.
	if min_rank == max_rank {
		// XXX: edge case: WildAsRank, of the same suit as this one card, group of
		// three. This edge case exists because unlike IsKind, we can't just take
		// the most numerous rank -- we might have multiple, different ranked Wild
		// cards we could slot in. But, we definitely need to handle this
		// differently.
		//
		// We might end up droping this conditional and handling range expansion
		// later.
		return gs.MostlyWildGroups
	}

	// Now we have a range (from min_rank to max_rank, distinct but inclusive)
	// that is represented in our group. However, we don't know whether the range
	// actually starts at min_rank and goes all the way to max_rank: it could be
	// that we have a wrapped range, or ace could be a high card.
	if min_rank == AceRank && max_rank == KingRank {
		if !gs.AceHigh || !gs.RunsWrap {
			// Because aces can't be high, and runs can't wrap, we can exit early.
			return false
		}

		// Do RunsWrap before AceHigh: AceHigh can be viewed as a restriction of
		// RunsWrap, where the two can't also be played. This affects wild slotting
		// strategy.
		if gs.RunsWrap {
			// Our strategy here is to first find the largest congruent section and
			// then update our indices around it. We swap min and max index though.
			// We know we only need to look from Two to Queen for a gap: Ace and King
			// are already slotted.
			max_gap_size := 0
			max_gap_index := NoneRank
			for new_min_index := TwoRank; new_min_index < QueenRank; new_min_index++ {
				if run_map[new_min_index] != -1 {
					continue
				}

				new_max_index := new_min_index
				for run_map[new_min_index] == -1 {
					new_max_index++
					// Guaranteed to terminate: we started at the Two and we know for
					// sure there's a King above us.
				}

				new_gap := int(new_max_index - new_min_index)
				if new_gap > max_gap_size {
					max_gap_size = new_gap

					// Tricky: set max_gap_index equal to new_min_index minus one. Why?
					// because this will become our new UPPER bound on the rank. This
					// means that min_rank and max_rank are swapped -- but using modular
					// arithmetic this kinda makes sense as bounds on a single wrapped
					// run. It also guarantees that we know later that we have a wrapped
					// run. Because the maximum gap must not neighbor any other missing
					// cards (and new_max_index above is chosen to be non-empty), we make
					// new_min_index non-empty as well by subtracting one.
					max_gap_index = new_min_index - 1
				}
			}

			// Tricky: here we swap the indices intentionally. Above, we looked for
			// an empty range of cards. We found the largest such index. We're hoping
			// that cards on either side can now be populated. new_max_index above
			// must be a populated card (see above) and will be treated as the upper
			// bound on a wrapped range. This makes min_rank > max_rank. :)
			max_rank = max_gap_index
			min_rank = max_gap_index + CardRank(max_gap_size)

			if run_map[max_rank] == -1 {
				panic("Expected max_index to be a populated index!")
			}
			if run_map[min_rank] == -1 {
				panic("Expected min_index to be a populated index!")
			}
		} else if gs.AceHigh {
			// Ignore the ace on the bottom. Find a new minimum and start over. This
			// is the easier case: if we "miss" the top and start over too early, we
			// know this wouldn't be a valid run (e.g,. 2 clubs, ace) even after
			// slotting in aces. Because we can have to expand any wrapped run down,
			// towards the Two, we can safely bump our minimum index.
			for index := min_rank + 1; index < max_rank; index++ {
				if run_map[index] != -1 {
					min_rank = index
					break
				}
			}

			// Update max_rank to be AceRank so we know we have a high ace.
			max_rank = AceRank
		}
	} else {
		// We have a fairly traditional, middle of the road (or, only touching one
		// end) run. We can ignore the indices as they already make sense.
	}

	// Now we need to slot wild cards into missing gaps. If we run out of wild
	// cards, we can safely exit early.
	//
	// XXX -- TODO.

	// Now we can try slotting in extra wild cards at any other adjacent place in
	// the run.
	//
	// XXX -- TODO.

	// Now we check bounds & wild card usage constraints.
	//
	// XXX -- TODO.

	return true
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
		if gs.IsWildCard(card) {
			wilds = append(wilds, card)
		} else {
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

	// Divide the sorted, ranked cards into partitions of group candidates.
	// Notably, without wild cards, no grouping can cross a gap of two ranks.
	// However, with wild cards, we can merge across groups.
	var ranked_partitions = gs.DivideHand(ranked)

	var groups = make([]int, len(hand))

	return gs.canMakeScore(hand, ranked, ranked_partitions, wilds, groups, score)
}

func (gs *GinSolver) canMakeScore(hand []Card, ranked []Card, ranked_partitions []int, wilds []Card, groups []int, score int) bool {
	return false
}

func (gs *GinSolver) groupValueSum(hand []Card, groups []int) int {
	return 0
}

func (gs *GinSolver) ComputeMinScore(hand []Card) int {
	return 10000
}
