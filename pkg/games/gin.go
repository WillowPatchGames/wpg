package games

import (
	"errors"
	"log"
	"sort"
	"strconv"

	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/figgy"
)

const GinGameOver string = "game is over"
const GinNextRound string = "begin next round"

type GinPlayer struct {
	Hand []Card `json:"hand"`

	Drawn           *Card   `json:"drawn"`
	PickedUpDiscard bool    `json:"picked_up_discard"`
	RoundScore      int     `json:"round_score"`
	Groups          [][]int `json:"groups"`
	Leftover        []int   `json:"leftover"`

	Score    int `json:"score"`
	Warnings int `json:"warnings"`
}

func (gp *GinPlayer) Init() {
	gp.Hand = make([]Card, 0)
	gp.Drawn = nil
}

func (gp *GinPlayer) FindCard(cardID int) (int, bool) {
	return FindCard(gp.Hand, cardID)
}

func (gp *GinPlayer) RemoveCard(cardID int) bool {
	index, found := gp.FindCard(cardID)
	if !found {
		return false
	}

	var remaining []Card
	if index > 0 {
		remaining = gp.Hand[:index]
	}
	remaining = append(remaining, gp.Hand[index+1:]...)
	gp.Hand = remaining

	return true
}

type GinConfig struct {
	NumPlayers int `json:"num_players" config:"type:int,min:2,default:2,max:2" label:"Number of players"` // Best with two.

	HandSize  int  `json:"min_draw_size" config:"type:int,min:8,default:10,max:14" label:"Hand size"`
	AddJokers bool `json:"add_jokers" config:"type:bool,default:false" label:"true:Add Jokers as permanent wild cards,false:Leave Jokers out"` // Add jokers as a permanent wild cards, two per deck used.

	SameSuitRuns bool `json:"same_suit_runs" config:"type:bool,default:true" label:"true:Require runs to be of the same suit,false:Allow mixed-suit runs"` // Whether runs have to be of the same suit.
	AceHigh      bool `json:"ace_high" config:"type:bool,default:false" label:"true:Aces are high,false:Aces are low"`

	LayingDownLimit int `json:"laying_down_limit" config:"type:int,min:0,default:10,max:20" label:"Laying down limit"`                                                                         // Number of points remaining in hand to lay down.
	WinAmount       int `json:"win_amount" config:"type:enum,default:100,options:50:50 Points;75:75 Points;100:100 Points;125:125 Points;150:150 Points;200:200 Points" label:"Ending amount"` // Number of points to end the game at.
	GinAmount       int `json:"gin_amount" config:"type:enum,default:10,options:5:5 Points;10:10 Points;20:20 Points;25:25 Points" label:"Gin score"`                                          // Bonus for going gin.
	BigGinAmount    int `json:"big_gin_amount" config:"type:enum,default:20,options:-1:Disabled;10:10 Points;20:20 Points;40:40 Points;50:50 Points" label:"Big Gin score"`                    // Bonus for going big gin.
	UndercutAmount  int `json:"undercut_amount" config:"type:enum,default:10,options:-1:Disabled;5:5 Points;10:10 Points;20:20 Points;25:25 Points" label:"Undercutting bonus"`                // Bonus for going gin.

	SuggestBetter bool `json:"suggest_better" config:"type:bool,default:true" label:"true:Tell users if they could get a better score,false:Don't tell users if they could get a better score"` // Whether to suggest better scores
}

func (cfg GinConfig) Validate() error {
	return nil
}

type GinRoundPlayer struct {
	DealtHand []Card `json:"dealt_hand"`
	FinalHand []Card `json:"final_hand"`

	Groups   [][]int `json:"groups"`
	Leftover []int   `json:"leftover"`

	RoundScore int `json:"round_score"`
	Score      int `json:"score"`
}

type GinTurn struct {
	Player int `json:"player"`

	TopDiscard  Card `json:"top_discard"`
	Drawn       Card `json:"drawn"`
	FromDiscard bool `json:"from_discard"`
	Discarded   Card `json:"discarded"`
	LaidDown    bool `json:"laid_down"`

	StartingHand []Card `json:"starting_hand"`
	EndingHand   []Card `json:"ending_hand"`
}

type GinRound struct {
	Dealer int `json:"dealer"`

	Players []GinRoundPlayer `json:"players"`
	Turns   []GinTurn        `json:"plays"`
	Discard []*Card          `json:"discard"`

	Deck []*Card `json:"deck"`
}

type GinState struct {
	Turn   int `json:"turn"`
	Dealer int `json:"dealer"`

	Deck         Deck        `json:"deck"`
	Discard      []*Card     `json:"discard"`
	Players      []GinPlayer `json:"players"` // Left of dealer is found by incrementing one.
	RoundHistory []*GinRound `json:"round_history"`

	Config GinConfig `json:"config"`

	Started  bool `json:"started"`
	Dealt    bool `json:"dealt"`
	LaidDown int  `json:"laid_down"`
	Finished bool `json:"finished"`

	Winner int `json:"winner"`
}

func (gs *GinState) Init(cfg GinConfig) error {
	var err error = figgy.Validate(cfg)
	if err != nil {
		log.Println("Error with GinConfig", err)
		return err
	}

	gs.Turn = -1
	gs.Dealer = -1

	gs.Discard = nil

	gs.Config = cfg

	gs.Started = false
	gs.Dealt = false
	gs.LaidDown = -1
	gs.Finished = false

	gs.Winner = -1

	return nil
}

func (gs *GinState) GetConfiguration() figgy.Figgurable {
	return gs.Config
}

func (gs *GinState) ReInit() error {
	// No-op for now. Nothing needs to be re-initialized after reloading
	// from JSON serialization.
	return nil
}

func (gs *GinState) IsStarted() bool {
	return gs.Started
}

func (gs *GinState) IsFinished() bool {
	return gs.Finished
}

func (gs *GinState) ResetStatus() {
	gs.Started = false
	gs.Finished = false
}

func (gs *GinState) Start(players int) error {
	var err error

	if gs.Started {
		log.Println("Error! Double start occurred...", err)
		return errors.New("double start occurred")
	}

	gs.Config.NumPlayers = players
	err = figgy.Validate(gs.Config)
	if err != nil {
		log.Println("Err with GinConfig after starting: ", err)
		return err
	}

	// Create all of the players.
	gs.Players = make([]GinPlayer, gs.Config.NumPlayers)
	for _, player := range gs.Players {
		player.Init()
	}

	// Force us to call StartRound() next.
	gs.Dealt = false
	gs.Dealer = 0

	// Start the round: shuffle the cards and (if necessary) deal them out.
	err = gs.StartRound()
	if err != nil {
		log.Println("Error starting round: ", err)
		return err
	}

	gs.Started = true
	return nil
}

func (gs *GinState) StartRound() error {
	if gs.Dealt {
		return errors.New("unable to deal if cards have already been dealt")
	}

	// Invariants: unless otherwise overridden below, start with dealt = false
	// and increment the round number.
	gs.Dealt = false
	gs.LaidDown = -1

	gs.RoundHistory = append(gs.RoundHistory, &GinRound{})
	history := gs.RoundHistory[len(gs.RoundHistory)-1]
	history.Dealer = gs.Dealer
	history.Players = make([]GinRoundPlayer, len(gs.Players))
	history.Turns = make([]GinTurn, 0)
	history.Discard = make([]*Card, 0)

	// Start with a clean deck and shuffle it.
	gs.Deck.Init()
	gs.Deck.AddStandard52Deck()
	if gs.Config.AddJokers {
		gs.Deck.AddJokers(2, true)
	}
	gs.Deck.Shuffle()

	// Save the initial deck.
	history.Deck = make([]*Card, len(gs.Deck.Cards))
	copy(history.Deck, gs.Deck.Cards)

	// Clear out all round-specific status before each round.
	for index := range gs.Players {
		gs.Players[index].Hand = make([]Card, 0)
		gs.Players[index].Drawn = nil
		gs.Players[index].PickedUpDiscard = false
		gs.Players[index].Warnings = 0
	}
	gs.Discard = make([]*Card, 0)

	// Deal out all cards. Start with the player left of the dealer. Deal them
	// gs.Round number of cards.
	starting_player := (gs.Dealer + 1) % len(gs.Players)
	for i := 0; i < gs.Config.HandSize; i++ {
		for player_offset := 0; player_offset < len(gs.Players); player_offset++ {
			player_index := (starting_player + player_offset) % len(gs.Players)
			gs.Players[player_index].Hand = append(gs.Players[player_index].Hand, *gs.Deck.Cards[0])
			gs.Deck.Cards = gs.Deck.Cards[1:]
		}
	}

	// Save the initial hands.
	for player_index := 0; player_index < len(gs.Players); player_index++ {
		history.Players[player_index].DealtHand = make([]Card, len(gs.Players[player_index].Hand))
		copy(history.Players[player_index].DealtHand, gs.Players[player_index].Hand)
	}

	// Add the top card to the discard stack.
	gs.Discard = append(gs.Discard, gs.Deck.Cards[0])
	gs.Deck.Cards = gs.Deck.Cards[1:]

	// The first person to play is the one left of the dealer.
	gs.Turn = starting_player
	gs.Dealt = true

	return nil
}

func (gs *GinState) TakeCard(player int, FromDiscard bool) error {
	if !gs.Started {
		return errors.New("game hasn't started yet")
	}

	if gs.Finished {
		return errors.New("game has already finished")
	}

	if player < 0 || player >= len(gs.Players) {
		return errors.New("not a valid player identifier: " + strconv.Itoa(player))
	}

	if !gs.Dealt {
		return errors.New("unable to take discard before dealing cards")
	}

	if gs.LaidDown != -1 {
		return errors.New("unable to take discard after going out")
	}

	if gs.Turn != player {
		return errors.New("unable to play out of turn")
	}

	if gs.Players[player].Drawn != nil {
		return errors.New("unable to take discard after already having taken card")
	}

	if FromDiscard && len(gs.Discard) == 0 {
		return errors.New("unable to draw with no more cards remaining")
	}

	if !FromDiscard && len(gs.Deck.Cards) == 0 {
		return errors.New("unable to draw with no more cards remaining")
	}

	history := gs.RoundHistory[len(gs.RoundHistory)-1]
	history.Turns = append(history.Turns, GinTurn{})
	turn := &history.Turns[len(history.Turns)-1]
	turn.Player = player
	turn.FromDiscard = FromDiscard
	turn.StartingHand = make([]Card, len(gs.Players[player].Hand))
	copy(turn.StartingHand, gs.Players[player].Hand)
	if len(gs.Discard) > 0 {
		turn.TopDiscard = *gs.Discard[len(gs.Discard)-1]
	}

	if FromDiscard {
		gs.Players[player].Drawn = gs.Discard[len(gs.Discard)-1]
		turn.Drawn = turn.TopDiscard
		gs.Discard = gs.Discard[:len(gs.Discard)-1]
	} else {
		gs.Players[player].Drawn = gs.Deck.Cards[0]
		turn.Drawn = *gs.Deck.Cards[0]
		gs.Deck.Cards = gs.Deck.Cards[1:]
	}
	gs.Players[player].PickedUpDiscard = FromDiscard

	return nil
}

func (gs *GinState) Order(player int, order []int) error {
	if !gs.Started {
		return errors.New("game hasn't started yet")
	}

	if gs.Finished {
		return errors.New("game has already finished")
	}

	if player < 0 || player >= len(gs.Players) {
		return errors.New("not a valid player identifier: " + strconv.Itoa(player))
	}

	by_id := make(map[int]int)
	for i, id := range order {
		by_id[id] = i
	}
	sort.SliceStable(gs.Players[player].Hand, func(i, j int) bool {
		ii, ok := by_id[gs.Players[player].Hand[i].ID]
		if !ok {
			ii = len(order)
		}
		jj, ok := by_id[gs.Players[player].Hand[j].ID]
		if !ok {
			jj = len(order)
		}
		return ii < jj
	})

	return nil
}

func (gs *GinState) DiscardCard(player int, cardID int, laidDown bool) error {
	if !gs.Started {
		return errors.New("game hasn't started yet")
	}

	if gs.Finished {
		return errors.New("game has already finished")
	}

	if player < 0 || player >= len(gs.Players) {
		return errors.New("not a valid player identifier: " + strconv.Itoa(player))
	}

	if !gs.Dealt {
		return errors.New("unable to discard before dealing cards")
	}

	if gs.Players[player].Drawn == nil {
		return errors.New("unable to discard after without having taken a card")
	}

	if gs.LaidDown == -1 && gs.Turn != player {
		return errors.New("it is not your turn to discard")
	}

	if gs.LaidDown != -1 && laidDown {
		return errors.New("somebody already laid down before you")
	}

	if cardID <= 0 && !laidDown {
		return errors.New("need to specify a card")
	}

	if cardID <= 0 && gs.Config.BigGinAmount == -1 {
		return errors.New("going big gin is not allowed in this game")
	}

	if laidDown {
		solver := gs.GinSolver()
		limit := gs.Config.LayingDownLimit
		newHand := make([]Card, len(gs.Players[player].Hand))
		for i, card := range gs.Players[player].Hand {
			if card.ID == cardID {
				newHand[i] = *gs.Players[player].Drawn
			} else {
				newHand[i] = card
			}
		}
		if cardID < 0 {
			newHand = append(newHand, *gs.Players[player].Drawn)
			limit = 0
		}
		min0 := solver.MinScoreBelow(newHand, limit)
		min1 := solver.MinScore(newHand)
		if min1 < min0 {
			log.Println("failed to compute actual min score", min1, "instead of", min0, "below", gs.Config.LayingDownLimit, "for hand", newHand)
		}
		if min0 > limit {
			pl := "s"
			if limit == 1 {
				pl = ""
			}
			log.Println(newHand)
			return errors.New("you cannot go out yet! must reach " + strconv.Itoa(limit) + " point" + pl + " first!")
		}
	}

	history := gs.RoundHistory[len(gs.RoundHistory)-1]
	turn := &history.Turns[len(history.Turns)-1]
	our_turn := turn.Player == player && gs.LaidDown == -1

	if our_turn {
		turn.LaidDown = laidDown
	}

	if cardID == gs.Players[player].Drawn.ID && gs.Players[player].PickedUpDiscard && gs.LaidDown == -1 && !laidDown {
		// If the player discards the card they picked up from the discard, give
		// them another change to make a move. Put the discard back and clear their
		// drawn card.
		gs.Discard = append(gs.Discard, gs.Players[player].Drawn)
		gs.Players[player].Drawn = nil
		return nil
	}

	// If we aren't going out and we're running out of cards, stop the game.
	// Assign the current player as the leader.
	if !laidDown && len(gs.Deck.Cards) <= len(gs.Players) {
		gs.Dealt = false
		gs.LaidDown = -1
		return errors.New(GinNextRound)
	}

	// We still advance the turn below. This isn't really necessary when we've
	// already had someone lay down, but simplifies the code.

	if cardID == gs.Players[player].Drawn.ID {
		// They must've taken the top card. Discard it and advance the turn.
		//
		// Copy the hand (which wasn't modified) into the turn information.
		turn.Discarded = *gs.Players[player].Drawn
		turn.EndingHand = make([]Card, len(gs.Players[player].Hand))
		copy(turn.EndingHand, gs.Players[player].Hand)

		gs.Discard = append(gs.Discard, gs.Players[player].Drawn)
		gs.Players[player].Drawn = nil
		gs.Turn = (gs.Turn + 1) % len(gs.Players)
		if laidDown {
			gs.HandleLayDown(player)
		}
		return nil
	}

	// Either they specified a card or they are going out with big gin. If they
	// specified a card, it must be in their hand, so remove the card from the
	// hand. Note that if they went out with big gin, they'll have an extra card
	// in their hand.
	if cardID <= 0 {
		// Check if the card is in the hand.
		index, found := gs.Players[player].FindCard(cardID)
		if !found {
			return errors.New("unable to find card with specified identifier")
		}

		// Discard this card and remove it from the hand.
		turn.Discarded = gs.Players[player].Hand[index]
		gs.Discard = append(gs.Discard, gs.Players[player].Hand[index].Copy())
		gs.Players[player].RemoveCard(cardID)
	}

	// Add the drawn card into the hand.
	gs.Players[player].Hand = append(gs.Players[player].Hand, *gs.Players[player].Drawn)
	gs.Players[player].Drawn = nil

	// Duplicate the hand for the history.
	turn.EndingHand = make([]Card, len(gs.Players[player].Hand))
	copy(turn.EndingHand, gs.Players[player].Hand)

	// Advanced the turn.
	gs.Turn = (gs.Turn + 1) % len(gs.Players)

	// Lay down if necessary.
	if laidDown {
		gs.HandleLayDown(player)
	}

	return nil
}

func (gs *GinState) HandleLayDown(player int) {
	// Notably, in Gin, we must first score the player's hand. Then we can score
	// the other player's hand, letting them play off of the player's hand who
	// laid down.
	gs.Turn = player
	gs.LaidDown = player

	for index := range gs.Players {
		gs.Players[index].RoundScore = -1
	}
}

func (gs *GinState) GinSolver() GinSolver {
	pv := make(map[CardRank]int, 14)
	for r := AceRank; r <= KingRank; r++ {
		pv[r] = int(r)
		if pv[r] > 10 {
			pv[r] = 10
		}
	}
	pv[JokerRank] = 20

	if gs.Config.AceHigh {
		pv[AceRank] = 15
	}

	wc := []CardRank{JokerRank}

	return GinSolver{
		PointValue:       pv,
		WildCards:        wc,
		AnyWildGroup:     false,
		WildAsRank:       false,
		AllWildGroups:    false,
		MostlyWildGroups: false,

		WildJokerRanked: false,
		SameSuitRuns:    gs.Config.SameSuitRuns,
		AceHigh:         gs.Config.AceHigh,
		AceLow:          !gs.Config.AceHigh,
		RunsWrap:        false,
	}
}

func (gs *GinState) ScoreByGroups(player int, groups [][]int, leftover []int) error {
	if !gs.Started {
		return errors.New("game hasn't started yet")
	}

	if gs.Finished {
		return errors.New("game has already finished")
	}

	if player < 0 || player >= len(gs.Players) {
		return errors.New("not a valid player identifier: " + strconv.Itoa(player))
	}

	if !gs.Dealt {
		return errors.New("unable to discard before dealing cards")
	}

	if gs.LaidDown == -1 {
		return errors.New("unable to score prior to laying down")
	}

	if gs.Turn != player {
		return errors.New("it is not your turn to score")
	}

	solver := gs.GinSolver()

	cards := make(map[int]bool)
	ncards := 0

	hand := gs.Players[player].Hand
	if player != gs.LaidDown {
		// From the laying down player's hand, only include stuff they have in
		// groups. Note, we assume that their hand was previously validated already.
		// This ensures that, if this player lays down with cards leftover and the
		// laying down player had points leftover, we don't count the sum of the
		// two leftover groups of cards against this player.
		var want_other_hand = false
		for _, group := range groups {
			for _, cardID := range group {
				if _, found := FindCard(hand, cardID); !found {
					log.Println("Want card not in our hand:", cardID)
					want_other_hand = true
					break
				}
			}

			if want_other_hand {
				break
			}
		}

		if want_other_hand {
			log.Println("Adding other hand")
			for _, card := range gs.Players[gs.LaidDown].Hand {
				var found = false
				for _, leftoverID := range gs.Players[gs.LaidDown].Leftover {
					if card.ID == leftoverID {
						found = true
						break
					}
				}

				if !found {
					hand = append(hand, card)
				}
			}
		}
	}

	for _, group := range groups {
		group_index := make([]int, 0)
		for _, cardID := range group {
			if _, ok := cards[cardID]; ok {
				return errors.New("card was used twice")
			}
			index, found := FindCard(hand, cardID)
			if !found {
				return errors.New("unable to find card with specified identifier")
			}
			cards[cardID] = true
			group_index = append(group_index, index)
			ncards += 1
		}
		if !solver.IsValidGroup(hand, group_index) {
			log.Println(hand, groups, leftover)
			// XXX better error message: stringify the cards?
			return errors.New("not a valid grouping")
		}
	}

	score := 0
	for _, cardID := range leftover {
		if _, ok := cards[cardID]; ok {
			return errors.New("card was used twice")
		}
		index, found := gs.Players[player].FindCard(cardID)
		if !found {
			return errors.New("unable to find card with specified identifier")
		}
		cards[cardID] = true
		card := gs.Players[player].Hand[index]
		score += solver.PointValue[card.Rank]
		ncards += 1
	}

	if ncards != len(gs.Players[player].Hand) {
		return errors.New("some cards were missing from scoring")
	}

	ideal := solver.MinScore(gs.Players[player].Hand)
	if ideal < score {
		max_warnings := 3
		gs.Players[player].Warnings += 1
		if gs.Config.SuggestBetter {
			if gs.Players[player].Warnings < max_warnings {
				return errors.New("you can get a better score")
			} else if gs.Players[player].Warnings == max_warnings {
				return errors.New("you can get a better score! last chance")
			}
		}
	}
	// Note that `score` is indeed a valid score for this hand
	// so it is suprising if it is better than `ideal`!
	if ideal > score {
		log.Println("failed to compute minimum score for hand; got", score, "expected", ideal, "for cards", gs.Players[player].Hand)
	}

	gs.Players[player].Groups = groups
	gs.Players[player].Leftover = leftover

	return gs.ReportScore(player, score)
}

func (gs *GinState) ReportScore(player int, score int) error {
	if !gs.Started {
		return errors.New("game hasn't started yet")
	}

	if gs.Finished {
		return errors.New("game has already finished")
	}

	if player < 0 || player >= len(gs.Players) {
		return errors.New("not a valid player identifier: " + strconv.Itoa(player))
	}

	if !gs.Dealt {
		return errors.New("unable to report score before dealing cards")
	}

	if gs.Players[player].Drawn != nil {
		return errors.New("unable to report score before discarding")
	}

	if gs.LaidDown == -1 {
		return errors.New("unable to report score until you've discarded")
	}

	gs.Players[player].RoundScore = score

	all_in := true
	for player_index, player := range gs.Players {
		if player.RoundScore == -1 {
			gs.Turn = player_index
			all_in = false
			break
		}
	}

	history := gs.RoundHistory[len(gs.RoundHistory)-1]

	if all_in {
		history.Discard = make([]*Card, len(gs.Discard))
		copy(history.Discard, gs.Discard)

		// Simplification: the player who gets the points this round must have an
		// "effective" max score. Why? Suppose the other player had more points.
		// However, since we played this round, we know that the other player
		// didn't have enough points to go out. Therefore, whatever points this
		// player has (from winning the round) would be what triggers ending the
		// game.
		var max_score int
		var our_index = gs.LaidDown
		var our_score = gs.Players[our_index].RoundScore
		var their_index = (our_index + 1) % len(gs.Players)
		var their_score = gs.Players[their_index].RoundScore
		if our_score < their_score {
			var bonus = 0
			if our_score == 0 {
				bonus = gs.Config.GinAmount
				if gs.Config.BigGinAmount != -1 && len(gs.Players[our_index].Hand) == gs.Config.HandSize+1 {
					bonus = gs.Config.BigGinAmount
				}
			}

			var delta = their_score - our_score + bonus
			gs.Players[our_index].Score += delta
			max_score = gs.Players[our_index].Score
		} else {
			var bonus = 0
			if gs.Config.UndercutAmount > 0 {
				bonus = gs.Config.UndercutAmount
			}

			var delta = their_score - our_score + bonus
			gs.Players[their_score].Score += delta
			max_score = gs.Players[their_score].Score
		}

		// Save round history, correctly! This must be done after score is
		// calculated but before we exit.
		for index := range gs.Players {
			history.Players[index].RoundScore = gs.Players[index].RoundScore
			history.Players[index].Score = gs.Players[index].Score
			history.Players[index].FinalHand = make([]Card, len(gs.Players[index].Hand))
			copy(history.Players[index].FinalHand, gs.Players[index].Hand)
			history.Players[index].Groups = gs.Players[index].Groups
			history.Players[index].Leftover = gs.Players[index].Leftover
		}

		// Note: there can't be a tie in this game. Suppose there were. Then both
		// players would've reached some value greater or equal to the win amount
		// already. However, we only added points to one player this round. So the
		// other player would've already triggered this condition earlier!
		if max_score >= gs.Config.WinAmount {
			gs.AssignWinner()
			return errors.New(GinGameOver)
		}

		gs.Dealer = (gs.Dealer + 1) % len(gs.Players)
		gs.Dealt = false
		gs.LaidDown = -1
		return errors.New(GinNextRound)
	}

	return nil
}

func (gs *GinState) AssignWinner() {
	max_score := gs.Players[0].Score
	winner := 0

	for index := range gs.Players {
		if gs.Players[index].Score > max_score {
			max_score = gs.Players[index].Score
			winner = index
		}
	}

	if max_score == gs.Players[gs.LaidDown].Score && winner != gs.LaidDown {
		winner = gs.LaidDown
	}

	gs.Winner = winner
	gs.Finished = true
}
