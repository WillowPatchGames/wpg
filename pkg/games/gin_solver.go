package games

import (
	"sort"
)

type GinSolver struct {
	PointValue map[CardRank]int `json:"point_value"`
	WildCards  []CardRank       `json:"wild_cards"`

	// The order of precedence is:
	//
	// 1. AllWildGroups
	// 2. WildAsRank
	// 3. MostlyWildGroups
	//
	// AllWildGroups allows any combination of all wild cards as allowed.
	// This means that four Jokers would be considered an allowed group, even if
	// MostlyWildGroups was false (leading to, for example, three Jokers and an
	// Ace being forbidden). Notably, if MostlyWildGroups is false, mixed type wild
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
	WildAsRank       bool `json:"wild_as_rank"`
	AllWildGroups    bool `json:"all_wild_groups"`
	MostlyWildGroups bool `json:"mostly_wild_groups"`

	WildJokerRanked bool `json:"wild_joker_rank"` // Whether wild Jokers can be used with WildAsRank
	SameSuitRuns    bool `json:"same_suit_runs"`
	AceHigh         bool `json:"ace_high"`
	AceLow          bool `json:"ace_low"`
	RunsWrap        bool `json:"runs_wrap"`
}

// Add step to current while wrapping in the range [min,max]
func addwrap(current CardRank, step CardRank, min CardRank, max CardRank) CardRank {
	return min + (current+step-min)%(1+max-min)
}

// Maps a hand of cards to their face values.
func (gs *GinSolver) HandToValues(hand []Card) []int {
	var result = make([]int, len(hand))
	for index, card := range hand {
		result[index] = gs.PointValue[card.Rank]
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
// two cards is more than `nwilds+1` (e.g., Two and Four of Clubs), the hand is
// considered partitioned. Notably, with only `nwilds` wild cards, two disjoint
// partitions may not be joined by either kinds or runs.
//
// Precondition: hand is already sorted. Otherwise, these partitions wouldn't
// make any sense.
func (gs *GinSolver) DivideHandBy(hand []Card, nwilds int) []int {
	var partitions []int

	// TODO: handle AceHigh and RunsWrap
	for index := 1; index < len(hand); index++ {
		var last_card = hand[index-1]
		var this_card = hand[index]
		if int(last_card.Rank)+nwilds+1 < int(this_card.Rank) {
			// Partition after last_card, but before this card.
			partitions = append(partitions, index)
		}
	}

	// Make sure the length is present. This ensures we stop the partition.
	partitions = append(partitions, len(hand))

	return partitions
}
func (gs *GinSolver) DivideHand(hand []Card) []int {
	return gs.DivideHandBy(hand, 0)
}

func subsets(items []int) [][]int {
	if len(items) == 0 {
		return [][]int{[]int{}}
	}
	without := subsets(items[1:])
	with := make([][]int, len(without))
	copy(with, without)
	for i, v := range with {
		cpy := make([]int, len(v), len(v)+1)
		copy(cpy, v)
		with[i] = append(cpy, items[0])
	}

	return append(with, without...)
}

func inRange(have int, expect Interval) bool {
	if expect.min == flag {
		return false
	}
	if expect.more == flag {
		return expect.min <= have
	}
	return expect.min <= have && have <= expect.min+expect.more
}

func (gs *GinSolver) TryWildCards(hand []Card, cards []int) [][]int {
	regular := make([]int, 0)
	wilds := make([]int, 0)

	for _, hand_index := range cards {
		card := hand[hand_index]
		if gs.IsWildCard(card) {
			if card.Rank != JokerRank || gs.WildJokerRanked {
				wilds = append(wilds, hand_index)
			}
		} else {
			regular = append(regular, hand_index)
		}
	}

	// In this case, trying wildcards as their rank is not allowed/will not produce benefits
	if !gs.WildAsRank || (gs.MostlyWildGroups && gs.AllWildGroups) || (gs.AllWildGroups && len(regular) == 0) {
		return [][]int{regular}
	}

	// Otherwise, take all subsets of wild cards, and add them back in as regular cards
	ret := subsets(wilds)
	for i, r := range ret {
		ret[i] = append(r, regular...)
	}
	return ret
}

// Whether or not a group of cards (defined as a set of indices in the hand
// array) are valid. Notably, we assume in our solver that it doesn't matter
// _how_ groups are counted, only that they are counted. This means that, if
// we have only five cards (6 5 5 5 4 3) whereby either a run or a kind could
// be formed, we can do either. Because the logic in isKind is less expensive,
// we do it ahead of isRun.
func (gs *GinSolver) IsValidGroup(hand []Card, cards []int) bool {
	// No valid group can only have 1 or 2 cards.
	if len(cards) < 3 {
		return false
	}

	tries := gs.TryWildCards(hand, cards)

	for _, try := range tries {
		if inRange(len(cards)-len(try), gs.WcValidGroup(hand, try)) {
			return true
		}
	}

	return false
}

func (gs *GinSolver) IsKind(hand []Card, cards []int) bool {
	// No valid group can only have 1 or 2 cards.
	if len(cards) < 3 {
		return false
	}

	tries := gs.TryWildCards(hand, cards)

	for _, try := range tries {
		if inRange(len(cards)-len(try), gs.WcKind(hand, try)) {
			return true
		}
	}

	return false
}

func (gs *GinSolver) IsRun(hand []Card, cards []int) bool {
	// No valid group can only have 1 or 2 cards.
	if len(cards) < 3 {
		return false
	}

	tries := gs.TryWildCards(hand, cards)

	for _, try := range tries {
		if inRange(len(cards)-len(try), gs.WcRun(hand, try)) {
			return true
		}
	}

	return false
}

const flag int = -1

type Interval struct {
	min  int
	more int
}

var none Interval = Interval{flag, flag}

func orInterval(l Interval, r Interval) Interval {
	if l.min == flag {
		return r
	}
	if r.min == flag {
		return l
	}
	// Semi-arbitrarily prefer matches with fewer required wildcards
	// (since excess wildcards probably can be accounted for,
	// except maybe in extreme edge cases)
	if l.min < r.min {
		return l
	}
	if r.min < l.min {
		return r
	}
	// Since they both require the same amount of wildcards,
	// return the one that allows a greater number of extras
	if l.more == flag || l.more > r.more {
		return l
	}
	return r
}
func AndInterval(l Interval, r Interval) Interval {
	if l.min == flag {
		return none
	}
	if r.min == flag {
		return none
	}
	more := l.more + r.more
	if l.more == flag || r.more == flag {
		more = flag
	}
	return Interval{l.min + r.min, more}
}

func (gs *GinSolver) WcValidGroup(hand []Card, cards []int) Interval {
	if len(cards) == 0 {
		if gs.AllWildGroups {
			return Interval{0, flag}
		}
		return none
	}
	return orInterval(gs.WcKind(hand, cards), gs.WcRun(hand, cards))
}

// This function assumes that the cards being passed as analyzed as their rank
// (i.e. don't worry about WildAsRank here, that is handled at a higher level),
// and returns the Interval of wildcards needed to make the match happen
func (gs *GinSolver) WcKind(hand []Card, cards []int) Interval {
	if len(cards) == 0 {
		if gs.AllWildGroups {
			return Interval{0, flag}
		}
		return none
	}

	rank := NoneRank

	for _, hand_index := range cards {
		card := hand[hand_index]
		if rank == NoneRank {
			rank = card.Rank
		} else if rank != card.Rank {
			return none
		}
	}

	min := 3 - len(cards)
	if min < 0 {
		min = 0
	}

	// If gs.MostlyWildGroups is false, we can only accept len(cards)-min extra
	// wildcards (and if we only have one card we can't form a group)
	if !gs.MostlyWildGroups {
		if len(cards) <= 1 {
			return none
		}
		return Interval{min, len(cards) - min}
	}

	// Otherwise, we accept mostly wild groups, so we can accept any number of
	// wildcards here and just need to ensure that there are at least 3 cards
	return Interval{min, flag}
}

// This function assumes that the cards being passed as analyzed as their rank
// (i.e. don't worry about WildAsRank here, that is handled at a higher level),
// and returns the Interval of wildcards needed to make the match happen
//
// TODO: handle WildJokerRanked
func (gs *GinSolver) WcRun(hand []Card, cards []int) Interval {
	if len(cards) == 0 && gs.AllWildGroups {
		return Interval{0, 13}
	}
	if len(cards) == 0 || len(cards) > 13 {
		return none
	}
	if len(cards) == 1 {
		if !gs.MostlyWildGroups {
			return none
		}
		return Interval{2, 11}
	}

	// A group of cards is a run IFF they have a designated start and end value,
	// where all ranks in the range are assigned, and optionally, follow a single
	// suit. To do so, we slot cards into a mapping, starting with non-wild cards.
	// Using the upper and lower bound on this mapping, we see if we can add in
	// wild cards to complete a valid range. Notably, unless WildJokerRanked is
	// set to true, the maximum value is a run is King, not Joker. Additionally,
	// we know that if two cards have the same rank, they cannot form a valid
	// run.
	var run_map = make(map[CardRank]int)
	var min_rank CardRank = NoneRank
	var max_rank CardRank = NoneRank
	var run_suit CardSuit = NoneSuit

	for index := NoneRank; index <= JokerRank; index++ {
		run_map[index] = -1
	}

	// Populate run_map and verify we have something that could be made into
	// a run with wildcards.
	for _, hand_index := range cards {
		card := hand[hand_index]
		if card.Rank < AceRank || card.Rank > KingRank {
			return none
		}
		if run_map[card.Rank] == -1 {
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
				return none
			}
		} else {
			// The given card is ranked (not wild) and we know its rank is already
			// represented in the solver. This is more like a Kind than a Run: no
			// duplicates are allowed.
			return none
		}
	}

	// If we have thirteen cards and got here, they must be ace through king
	if len(cards) == 13 {
		// We need no wildcards to complete it, we cannot take any more wildcards
		return Interval{0, 0}
	}

	// Find largest gap
	// By default it is the initial gap and final gap
	// But we can do a sliding window
	// max_gap_size := 13 - int(max_rank - min_rank)
	max_gap_size := int((min_rank - AceRank) + (KingRank - max_rank))
	if gs.RunsWrap || gs.AceHigh {
		// If Ace is only allowed to be high, we force it to take the result from
		// the first iteration
		force := gs.AceHigh && !gs.RunsWrap && !gs.AceLow
		// Find the largest congruent gap.
		// Start at TwoRank, since we already accounted for AceRank above
		new_min_index := TwoRank
		// We will end at KingRank if RunsWrap, else just check TwoRank
		check_rank := TwoRank
		if gs.RunsWrap {
			check_rank = KingRank
		}
		for new_min_index <= check_rank {
			if run_map[new_min_index] != -1 && !force {
				new_min_index = new_min_index + 1
				continue
			}
			// new_min_index now points at the start of a gap

			new_max_index := new_min_index + 1
			for run_map[addwrap(new_max_index, 0, AceRank, KingRank)] == -1 {
				new_max_index++
			}
			// new_max_index now points right after the end of the gap

			new_gap := int(new_max_index - new_min_index)
			if new_gap > max_gap_size || force {
				max_gap_size = new_gap
			}

			// now we look starting from two after the end of the gap
			// (because a subset of the gap we already found will be smaller,
			// and new_min_index points at a populated element which will
			// not be the start of a gap)
			new_min_index = new_max_index + 1
		}
	}

	// The spread of cards in the run
	spread := 13 - max_gap_size
	// The number of wildcards to fill in the internal gaps
	min := spread - len(cards)
	// ... but we need at least 3 cards
	if len(cards) < 3 && 3-len(cards) > min {
		min = 3 - len(cards)
	}

	// We can keep adding wildcards until we reach a full 13-card run
	more := 13 - len(cards) - min
	// Or until we have more wildcards than non-wildcards
	if !gs.MostlyWildGroups && (len(cards)-min < more) {
		more = len(cards) - min
	}

	return Interval{min, more}
}

func (gs *GinSolver) MinScore(hand []Card) int {
	allCost := 0
	for _, card := range hand {
		allCost += gs.PointValue[card.Rank]
	}
	return gs.MinScoreBelow(hand, allCost-1)
}

func (gs *GinSolver) MinScoreBelow(hand []Card, maxScore int) int {
	minScore := maxScore + 1

	if len(hand) < 3 {
		return minScore
	}

	var wilds = make([]int, 0)       // indices of wilds
	var all = make([]int, len(hand)) // all indices
	for card := range hand {
		if gs.IsWildCard(hand[card]) {
			wilds = append(wilds, card)
		}
		all[card] = card
	}

	// Make a list of the costs of each wild card,
	// sorted so we can pop the highest cost ones first
	wildCosts := make([]int, len(wilds))
	for i, r := range wilds {
		wildCosts[i] = gs.PointValue[hand[r].Rank]
	}
	sort.Ints(wildCosts)

	// These are the sets of nonwild cards we try
	// (if WildAsRank, this may include wild cards too)
	tries := gs.TryWildCards(hand, all)

	for _, nonwild := range tries {
		nwilds := len(all) - len(nonwild)
		// The nonwild card objects in this mini hand
		rankedHere := make([]Card, 0)
		for _, r := range nonwild {
			rankedHere = append(rankedHere, hand[r])
		}
		sort.SliceStable(rankedHere, func(i, j int) bool {
			return rankedHere[i].Rank < rankedHere[j].Rank
		})
		// Partition it into disjoint subsets
		// that cannot be connected by `nwilds` wild cards
		divided := gs.DivideHandBy(rankedHere, nwilds)

		// Calculate the indices for each division
		// TODO: refactor
		last := 0
		divisions := make([][]int, 0)
		for _, divide := range divided {
			division := make([]int, divide-last)
			for l := last; last < divide; last++ {
				division[last-l] = last
			}
			divisions = append(divisions, division)
		}
		// TODO: see if the things actually need to wrap idk
		shouldWrap := gs.AceHigh || gs.RunsWrap
		if len(divisions) > 1 && shouldWrap {
			tail := divisions[len(divisions)-1]
			divisions = divisions[:len(divisions)-1]
			divisions[0] = append(divisions[0], tail...)
		}

		// Compute the results on each division
		// (since we know they are independent)
		//
		// Each result is a map from a certain number of wildcards
		// to the minimum score achievable using that many wildcards
		dividedResults := make([]DividedResult, len(divisions))
		for i, division := range divisions {
			dividedResults[i] = gs.DivideResult(rankedHere, division, minScore-1, nwilds)
		}

		// Find the best solution by iterating over number of
		// wildcards used
		wildCost := 0
		for used := nwilds; used >= 0; used-- {
			// Divide the wildcards amongst the divisions
			// and get the minimum of all those divisions
			// and add the cost of unused wildcards
			score := wildCost + findLeast(dividedResults, minScore-1, nwilds)
			if score < minScore {
				minScore = score
			}
			if used > 0 {
				wildCost += wildCosts[nwilds-used]
				// Blimey, we blew it
				if wildCost >= minScore {
					break
				}
			}
		}

		// Success!
		if minScore == 0 {
			break
		}
	}

	return minScore
}

// Map from wildcards to cost
type DividedResult = map[int]int

// A match, consisting of card indices, their cost,
// and the wildcard interval required to make it work
type Match struct {
	cards []int
	cost  int
	wc    Interval
}

// Brute force: take each subset, and return all valid matches
func (gs *GinSolver) AllMatches(hand []Card, cards []int) []Match {
	r := make([]Match, 0)
	for _, subset := range subsets(cards) {
		if len(subset) == 0 {
			continue
		}
		wc := gs.WcValidGroup(hand, subset)
		if wc.min != flag {
			cost := 0
			for _, card := range subset {
				cost += gs.PointValue[hand[card].Rank]
			}
			r = append(r, Match{subset, cost, wc})
		}
	}
	// An extra match to vacuum up any lonely wildcards
	if gs.AllWildGroups {
		r = append(r, Match{[]int{}, 0, Interval{3, flag}})
	}
	return r
}

// Find all matches …
//  - … using no cards from `omit`, and …
//  - … using less than `nwilds` wildcards
//
// FIXME: actually make these maximal lol
func maximalMatchesLessThanWithout(all []Match, omit map[int]bool, nwilds int) []Match {
	// Base case: empty match
	if len(all) == 0 {
		return []Match{Match{make([]int, 0), 0, Interval{0, 0}}}
	}
	// First compute the matches that exclude this first match
	this := all[0]
	rest := all[1:]
	without := maximalMatchesLessThanWithout(rest, omit, nwilds)

	// If we cannot include this due to nwilds constraints,
	// just return the matches without this
	if this.wc.min == flag || this.wc.min > nwilds {
		return without
	}

	newomit := make(map[int]bool, len(omit))
	for card := range omit {
		newomit[card] = omit[card]
	}
	// If this match overlaps with omit, we cannot include it
	// (note: we update omit as we go)
	for _, card := range this.cards {
		if omit[card] {
			return without
		}
		newomit[card] = true
	}

	// Now compute the matches that include this first match
	// (note that `omit` has already been updated above)
	// (note that we take up `this.wc.min` wildcards!)
	for _, m := range maximalMatchesLessThanWithout(rest, newomit, nwilds-this.wc.min) {
		// Append this to the existing match
		with := Match{
			append(m.cards, this.cards...),
			m.cost + this.cost,
			AndInterval(m.wc, this.wc),
		}
		// And add it if it fits
		if with.wc.min != flag && with.wc.min <= nwilds {
			without = append(without, with)
		}
	}
	return without
}

func (gs *GinSolver) DivideResult(hand []Card, cards []int, maxScore int, nwilds int) DividedResult {
	all := make([]Match, 0)
	for _, match := range gs.AllMatches(hand, cards) {
		// Filter out matches that require too many wildcards
		if match.wc.min <= nwilds {
			all = append(all, match)
		}
	}

	// Compute the cost of all these cards
	// so we can subtract the cost of used cards
	allCost := 0
	for _, card := range cards {
		allCost += gs.PointValue[hand[card].Rank]
	}

	// Initialize the result with the maxScore+1 worst case
	r := make(DividedResult)
	for used := nwilds; used >= 0; used-- {
		r[used] = maxScore + 1
	}
	// Compute matches bounded by 0..nwilds
	for used := nwilds; used >= 0; used-- {
		// Look at all maximalish aggregated matches
		for _, match := range maximalMatchesLessThanWithout(all, make(map[int]bool), used) {
			if match.wc.min == flag {
				continue // not a match, shouldn't happen
			}
			deadwood := allCost - match.cost
			if deadwood > maxScore {
				continue
			}

			// Even though we set `used` as the limit of wildcards,
			// the match actually applies to a range of wildcards,
			max := match.wc.min + match.wc.more
			if match.wc.more == flag || max > nwilds {
				max = nwilds
			}
			// so try setting it for each in the range
			for u := match.wc.min; u <= max; u++ {
				if deadwood < r[u] {
					r[u] = deadwood
				}
			}
		}
	}

	return r
}

// Given results, compute the best assignment of wildcards
func findLeast(dividedResults []DividedResult, maxScore int, nwilds int) int {
	minScore := maxScore + 1
	// Allocate `nwilds` across each division
	for _, chosen := range choose(len(dividedResults), nwilds) {
		score := 0
		// Add up the cost of each of the divisions
		for i, choice := range chosen {
			sc, ok := dividedResults[i][choice]
			if !ok {
				// wasn't possible to have this many wildcards
				// in this division
				score = minScore
				break
			}
			score += sc
			if score >= minScore {
				// already overrun
				break
			}
		}
		if score < minScore {
			minScore = score
		}
	}
	return minScore
}

// All arrays of length n that sum to c
func choose(n int, c int) [][]int {
	if n == 0 {
		if c == 0 {
			return [][]int{[]int{}}
		} else {
			return [][]int{}
		}
	}
	r := make([][]int, 0)
	for t := c; t >= 0; t-- {
		r2 := choose(n-1, c-t)
		for i := range r2 {
			r2[i] = append(r2[i], t)
		}
		r = append(r, r2...)
	}
	return r
}
