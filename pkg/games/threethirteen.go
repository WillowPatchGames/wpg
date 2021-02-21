package games

import (
	"errors"
	"log"
	"sort"
	"strconv"

	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/figgy"
)

const ThreeThirteenGameOver string = "game is over"
const ThreeThirteenNextRound string = "begin next round"

type ThreeThirteenPlayer struct {
	Hand []Card `json:"hand"`

	Drawn           *Card   `json:"drawn"`
	PickedUpDiscard bool    `json:"picked_up_discard"`
	RoundScore      int     `json:"round_score"`
	Groups          [][]int `json:"groups"`
	Leftover        []int   `json:"leftover"`

	Score    int `json:"score"`
	Warnings int `json:"warnings"`
}

func (ttp *ThreeThirteenPlayer) Init() {
	ttp.Hand = make([]Card, 0)
	ttp.Drawn = nil
}

func (ttp *ThreeThirteenPlayer) FindCard(cardID int) (int, bool) {
	return FindCard(ttp.Hand, cardID)
}

func (ttp *ThreeThirteenPlayer) RemoveCard(cardID int) bool {
	var ret bool
	_, ttp.Hand, ret = RemoveCard(ttp.Hand, cardID)
	return ret
}

type ThreeThirteenConfig struct {
	NumPlayers int `json:"num_players" config:"type:int,min:1,default:4,max:15" label:"Number of players"` // Best with four-ish.

	MinDrawSize int  `json:"min_draw_size" config:"type:int,min:13,default:15,max:40" label:"Minimum number of extra cards (per player)"`       // Minimum card count overhead per player -- used when calculating number of decks to use. Best with 7ish.
	AddJokers   bool `json:"add_jokers" config:"type:bool,default:true" label:"true:Add Jokers as permanent wild cards,false:Leave Jokers out"` // Add jokers as a permanent wild cards, two per deck used.

	WildAsRank        bool `json:"wilds_as_rank" config:"type:bool,default:true" label:"true:Use non-Joker wild cards as their rank,false:Always treat wild cards as wild"`                            // Whether to allow wild cards to become their rank.
	AllowMostlyWild   bool `json:"allow_mostly_wild" config:"type:bool,default:false" label:"true:Allow groups with mostly wild cards,false:Only allow up to half of the cards in a group to be wild"` // Allow groupings to have more wild cards than non-wild cards.
	AllowAllWildCards bool `json:"allow_all_wild_cards" config:"type:bool,default:false" label:"true:Allow all cards in a group to be wild,false:Forbid all-wild groups"`                              // Whether or not to allow a grouping of all wild cards.
	SameSuitRuns      bool `json:"same_suit_runs" config:"type:bool,default:true" label:"true:Require runs to be of the same suit,false:Allow mixed-suit runs"`                                        // Whether runs have to be of the same suit.
	AceHigh           bool `json:"ace_high" config:"type:bool,default:false" label:"true:Aces are high,false:Aces are low"`                                                                            // Whether ace is high or low.

	LayingDownLimit     int  `json:"laying_down_limit" config:"type:int,min:0,default:0,max:20" label:"Laying down limit"`                                                                          // 0 <= n <= 20. Number of points remaining in hand to lay down.
	WithFourteenthRound bool `json:"with_fourteenth_round" config:"type:bool,default:false" label:"true:Play an extra round with no ranked wild cards,false:Stick to thirteen rounds (Kings wild)"` // Whether to add an additional round without numbered wilds.
	AllowLastDraw       bool `json:"allow_last_draw" config:"type:bool,default:true" label:"true:Give everyone else one last draw after going out,false:End round immediately after going out"`     // Whether to give every player one last draw after someone lays down.

	ToPointLimit int  `json:"to_point_limit" config:"type:enum,default:-1,options:-1:No Point Limit;50:50 Points;100:100 Points;150:150 Points;200:200 Points;250:250 Points" label:"Point limit to end early"` // -1 or 50 <= n <= 250. Whether to have a point limit to end the game early.
	GolfScoring  bool `json:"golf_scoring" config:"type:bool,default:true" label:"true:Count points against yourself,false:Give points to the player laying down"`                                              // Whether least points win or most points win (different scoring mechanism).

	SuggestBetter bool `json:"suggest_better" config:"type:bool,default:true" label:"true:Tell users if they could get a better score,false:Don't tell users if they could get a better score"` // Whether to suggest better scores
}

func (cfg ThreeThirteenConfig) Validate() error {
	return nil
}

type ThreeThirteenRoundPlayer struct {
	DealtHand []Card `json:"dealt_hand"`
	FinalHand []Card `json:"final_hand"`

	Groups   [][]int `json:"groups"`
	Leftover []int   `json:"leftover"`

	RoundScore int `json:"round_score"`
	Score      int `json:"score"`
}

type ThreeThirteenTurn struct {
	Player int `json:"player"`

	TopDiscard  Card `json:"top_discard"`
	Drawn       Card `json:"drawn"`
	FromDiscard bool `json:"from_discard"`
	Discarded   Card `json:"discarded"`
	LaidDown    bool `json:"laid_down"`

	StartingHand []Card `json:"starting_hand"`
	EndingHand   []Card `json:"ending_hand"`
}

type ThreeThirteenRound struct {
	Size   int `json:"size"`
	Dealer int `json:"dealer"`

	Players []ThreeThirteenRoundPlayer `json:"players"`
	Turns   []ThreeThirteenTurn        `json:"plays"`
	Discard []*Card                    `json:"discard"`

	Deck []*Card `json:"deck"`
}

type ThreeThirteenState struct {
	Turn   int `json:"turn"`
	Dealer int `json:"dealer"`

	Deck         Deck                  `json:"deck"`
	Discard      []*Card               `json:"discard"`
	Players      []ThreeThirteenPlayer `json:"players"` // Left of dealer is found by incrementing one.
	Round        int                   `json:"round"`
	RoundHistory []*ThreeThirteenRound `json:"round_history"`

	Config ThreeThirteenConfig `json:"config"`

	Started  bool `json:"started"`
	Dealt    bool `json:"dealt"`
	LaidDown int  `json:"laid_down"`
	Finished bool `json:"finished"`

	Winner int `json:"winner"`
}

func (tts *ThreeThirteenState) Init(cfg ThreeThirteenConfig) error {
	var err error = figgy.Validate(cfg)
	if err != nil {
		log.Println("Error with ThreeThirteenConfig", err)
		return err
	}

	tts.Turn = -1
	tts.Dealer = -1

	tts.Discard = nil

	tts.Config = cfg

	tts.Started = false
	tts.Dealt = false
	tts.LaidDown = -1
	tts.Finished = false

	tts.Winner = -1

	return nil
}

func (tts *ThreeThirteenState) GetConfiguration() figgy.Figgurable {
	return tts.Config
}

func (tts *ThreeThirteenState) ReInit() error {
	// No-op for now. Nothing needs to be re-initialized after reloading
	// from JSON serialization.
	return nil
}

func (tts *ThreeThirteenState) IsStarted() bool {
	return tts.Started
}

func (tts *ThreeThirteenState) IsFinished() bool {
	return tts.Finished
}

func (tts *ThreeThirteenState) ResetStatus() {
	tts.Started = false
	tts.Finished = false
}

func (tts *ThreeThirteenState) Start(players int) error {
	var err error

	if tts.Started {
		log.Println("Error! Double start occurred...", err)
		return errors.New("double start occurred")
	}

	tts.Config.NumPlayers = players
	err = figgy.Validate(tts.Config)
	if err != nil {
		log.Println("Err with ThreeThirteenConfig after starting: ", err)
		return err
	}

	// Create all of the players.
	tts.Players = make([]ThreeThirteenPlayer, tts.Config.NumPlayers)
	for _, player := range tts.Players {
		player.Init()
	}

	// Force us to call StartRound() next.
	tts.Dealt = false
	tts.Dealer = 0
	tts.Round = 2

	// Start the round: shuffle the cards and (if necessary) deal them out.
	err = tts.StartRound()
	if err != nil {
		log.Println("Error starting round: ", err)
		return err
	}

	tts.Started = true
	return nil
}

func (tts *ThreeThirteenState) StartRound() error {
	if tts.Dealt {
		return errors.New("unable to deal if cards have already been dealt")
	}

	// Invariants: unless otherwise overridden below, start with dealt = false
	// and increment the round number.
	tts.Dealt = false
	tts.LaidDown = -1
	tts.Round += 1

	tts.RoundHistory = append(tts.RoundHistory, &ThreeThirteenRound{})
	history := tts.RoundHistory[len(tts.RoundHistory)-1]
	history.Dealer = tts.Dealer
	history.Size = tts.Round
	history.Players = make([]ThreeThirteenRoundPlayer, len(tts.Players))
	history.Turns = make([]ThreeThirteenTurn, 0)
	history.Discard = make([]*Card, 0)

	// Start with a clean deck and shuffle it.
	tts.Deck.Init()

	// Figure out how many cards we need per player in the worst case.
	max_round := 13
	if tts.Config.WithFourteenthRound {
		max_round = 14
	}

	if tts.Round > max_round {
		tts.Finished = true
		return errors.New(ThreeThirteenGameOver)
	}

	// Figure out how many cards in a deck we have.
	deck_size := 52
	if tts.Config.AddJokers {
		deck_size = 54
	}

	// Figure out how many decks we need.
	num_decks := (tts.Config.NumPlayers*(tts.Config.MinDrawSize+max_round) + (deck_size - 1)) / (deck_size)
	if num_decks < 1 {
		num_decks = 1
	}

	for num_decks > 0 {
		tts.Deck.AddStandard52Deck()
		if tts.Config.AddJokers {
			tts.Deck.AddJokers(2, true)
		}

		num_decks -= 1
	}

	// Shuffling the deck.
	tts.Deck.Shuffle()

	// Save the initial deck.
	history.Deck = make([]*Card, len(tts.Deck.Cards))
	copy(history.Deck, tts.Deck.Cards)

	// Clear out all round-specific status before each round.
	for index := range tts.Players {
		tts.Players[index].Hand = make([]Card, 0)
		tts.Players[index].Groups = make([][]int, 0)
		tts.Players[index].Drawn = nil
		tts.Players[index].PickedUpDiscard = false
		tts.Players[index].Warnings = 0
	}
	tts.Discard = make([]*Card, 0)

	// Deal out all cards. Start with the player left of the dealer. Deal them
	// tts.Round number of cards.
	starting_player := (tts.Dealer + 1) % len(tts.Players)
	for i := 0; i < tts.Round; i++ {
		for player_offset := 0; player_offset < len(tts.Players); player_offset++ {
			player_index := (starting_player + player_offset) % len(tts.Players)
			tts.Players[player_index].Hand = append(tts.Players[player_index].Hand, *tts.Deck.Cards[0])
			tts.Deck.Cards = tts.Deck.Cards[1:]
		}
	}

	// Save the initial hands.
	for player_index := 0; player_index < len(tts.Players); player_index++ {
		history.Players[player_index].DealtHand = make([]Card, len(tts.Players[player_index].Hand))
		copy(history.Players[player_index].DealtHand, tts.Players[player_index].Hand)
	}

	// Add the top card to the discard stack.
	tts.Discard = append(tts.Discard, tts.Deck.Cards[0])
	tts.Deck.Cards = tts.Deck.Cards[1:]

	// The first person to play is the one left of the dealer.
	tts.Turn = starting_player
	tts.Dealt = true

	return nil
}

func (tts *ThreeThirteenState) TakeCard(player int, FromDiscard bool) error {
	if !tts.Started {
		return errors.New("game hasn't started yet")
	}

	if tts.Finished {
		return errors.New("game has already finished")
	}

	if player < 0 || player >= len(tts.Players) {
		return errors.New("not a valid player identifier: " + strconv.Itoa(player))
	}

	if !tts.Dealt {
		return errors.New("unable to take discard before dealing cards")
	}

	if tts.LaidDown != -1 {
		return errors.New("unable to take discard after going out")
	}

	if tts.Turn != player {
		return errors.New("unable to play out of turn")
	}

	if tts.Players[player].Drawn != nil {
		return errors.New("unable to take discard after already having taken card")
	}

	if FromDiscard && len(tts.Discard) == 0 {
		return errors.New("unable to draw with no more cards remaining")
	}

	if !FromDiscard && len(tts.Deck.Cards) == 0 {
		return errors.New("unable to draw with no more cards remaining")
	}

	history := tts.RoundHistory[len(tts.RoundHistory)-1]
	history.Turns = append(history.Turns, ThreeThirteenTurn{})
	turn := &history.Turns[len(history.Turns)-1]
	turn.Player = player
	turn.FromDiscard = FromDiscard
	turn.StartingHand = make([]Card, len(tts.Players[player].Hand))
	copy(turn.StartingHand, tts.Players[player].Hand)
	if len(tts.Discard) > 0 {
		turn.TopDiscard = *tts.Discard[len(tts.Discard)-1]
	}

	if FromDiscard {
		tts.Players[player].Drawn = tts.Discard[len(tts.Discard)-1]
		turn.Drawn = turn.TopDiscard
		tts.Discard = tts.Discard[:len(tts.Discard)-1]
	} else {
		tts.Players[player].Drawn = tts.Deck.Cards[0]
		turn.Drawn = *tts.Deck.Cards[0]
		tts.Deck.Cards = tts.Deck.Cards[1:]
	}
	tts.Players[player].PickedUpDiscard = FromDiscard

	return nil
}

func (tts *ThreeThirteenState) Order(player int, order []int) error {
	if !tts.Started {
		return errors.New("game hasn't started yet")
	}

	if tts.Finished {
		return errors.New("game has already finished")
	}

	if player < 0 || player >= len(tts.Players) {
		return errors.New("not a valid player identifier: " + strconv.Itoa(player))
	}

	by_id := make(map[int]int)
	for i, id := range order {
		by_id[id] = i
	}
	sort.SliceStable(tts.Players[player].Hand, func(i, j int) bool {
		ii, ok := by_id[tts.Players[player].Hand[i].ID]
		if !ok {
			ii = len(order)
		}
		jj, ok := by_id[tts.Players[player].Hand[j].ID]
		if !ok {
			jj = len(order)
		}
		return ii < jj
	})

	return nil
}

func (tts *ThreeThirteenState) DiscardCard(player int, cardID int, laidDown bool) error {
	if !tts.Started {
		return errors.New("game hasn't started yet")
	}

	if tts.Finished {
		return errors.New("game has already finished")
	}

	if player < 0 || player >= len(tts.Players) {
		return errors.New("not a valid player identifier: " + strconv.Itoa(player))
	}

	if !tts.Dealt {
		return errors.New("unable to discard before dealing cards")
	}

	if tts.Players[player].Drawn == nil {
		return errors.New("unable to discard after without having taken a card")
	}

	if tts.LaidDown == -1 && tts.Turn != player {
		return errors.New("it is not your turn to discard")
	}

	if tts.LaidDown != -1 && laidDown {
		return errors.New("somebody already laid down before you")
	}

	if cardID <= 0 {
		return errors.New("need to specify a card")
	}

	if laidDown {
		gs := tts.GinSolver()
		newHand := make([]Card, len(tts.Players[player].Hand))
		for i, card := range tts.Players[player].Hand {
			if card.ID == cardID {
				newHand[i] = *tts.Players[player].Drawn
			} else {
				newHand[i] = card
			}
		}
		min0 := gs.MinScoreBelow(newHand, tts.Config.LayingDownLimit)
		min1 := gs.MinScore(newHand)
		if min1 < min0 {
			log.Println("failed to compute actual min score", min1, "instead of", min0, "below", tts.Config.LayingDownLimit, "for hand", newHand)
		}
		if min0 > tts.Config.LayingDownLimit {
			pl := "s"
			if tts.Config.LayingDownLimit == 1 {
				pl = ""
			}
			log.Println(newHand)
			return errors.New("you cannot go out yet! must reach " + strconv.Itoa(tts.Config.LayingDownLimit) + " point" + pl + " first!")
		}
	}

	history := tts.RoundHistory[len(tts.RoundHistory)-1]
	turn := &history.Turns[len(history.Turns)-1]
	our_turn := turn.Player == player && tts.LaidDown == -1

	if our_turn {
		turn.LaidDown = laidDown
	}

	if cardID == tts.Players[player].Drawn.ID && tts.Players[player].PickedUpDiscard && tts.LaidDown == -1 && !laidDown {
		// If the player discards the card they picked up from the discard, give
		// them another change to make a move. Put the discard back and clear their
		// drawn card.
		tts.Discard = append(tts.Discard, tts.Players[player].Drawn)
		tts.Players[player].Drawn = nil
		return nil
	}

	// If we aren't going out and we're running out of cards, stop the game.
	// Assign the current player as the leader.
	if !laidDown && len(tts.Deck.Cards) <= len(tts.Players) {
		laidDown = true
	}

	// We still advance the turn below. This isn't really necessary when we've
	// already had someone lay down, but simplifies the code.

	if cardID == tts.Players[player].Drawn.ID {
		// They must've taken the top card. Discard it and advance the turn.
		//
		// Copy the hand (which wasn't modified) into the turn information.
		turn.Discarded = *tts.Players[player].Drawn
		turn.EndingHand = make([]Card, len(tts.Players[player].Hand))
		copy(turn.EndingHand, tts.Players[player].Hand)

		tts.Discard = append(tts.Discard, tts.Players[player].Drawn)
		tts.Players[player].Drawn = nil
		tts.Turn = (tts.Turn + 1) % len(tts.Players)
		if laidDown {
			tts.HandleLayDown(player)
		}
		return nil
	}

	// Check if the card is in the hand.
	index, found := tts.Players[player].FindCard(cardID)
	if !found {
		return errors.New("unable to find card with specified identifier")
	}

	// Discard this card and remove it from the hand.
	turn.Discarded = tts.Players[player].Hand[index]
	tts.Discard = append(tts.Discard, tts.Players[player].Hand[index].Copy())
	tts.Players[player].RemoveCard(cardID)

	// Add the drawn card into the hand.
	tts.Players[player].Hand = append(tts.Players[player].Hand, *tts.Players[player].Drawn)
	tts.Players[player].Drawn = nil

	// Duplicate the hand for the history.
	turn.EndingHand = make([]Card, len(tts.Players[player].Hand))
	copy(turn.EndingHand, tts.Players[player].Hand)

	// Advanced the turn.
	tts.Turn = (tts.Turn + 1) % len(tts.Players)

	// Lay down if necessary.
	if laidDown {
		tts.HandleLayDown(player)
	}

	return nil
}

func (tts *ThreeThirteenState) HandleLayDown(player int) {
	tts.LaidDown = player

	for index := range tts.Players {
		tts.Players[index].RoundScore = -1
	}

	if tts.Config.AllowLastDraw && len(tts.Deck.Cards) >= len(tts.Players)-1 {
		for player_offset := 1; player_offset < len(tts.Players); player_offset++ {
			player_index := (player + player_offset) % len(tts.Players)
			tts.Players[player_index].Drawn = tts.Deck.Cards[0]
			tts.Deck.Cards = tts.Deck.Cards[1:]
			tts.Turn = player_index
		}
	}
}

func (tts *ThreeThirteenState) GinSolver() GinSolver {
	pv := make(map[CardRank]int, 14)
	for r := AceRank; r <= KingRank; r++ {
		pv[r] = int(r)
		if pv[r] > 10 {
			pv[r] = 10
		}
	}
	pv[JokerRank] = 20

	if tts.Config.AceHigh {
		pv[AceRank] = 15
	}

	wc := []CardRank{CardRank(tts.Round), JokerRank}

	return GinSolver{
		PointValue:       pv,
		WildCards:        wc,
		WildAsRank:       tts.Config.WildAsRank,
		AllWildGroups:    tts.Config.AllowAllWildCards,
		MostlyWildGroups: tts.Config.AllowMostlyWild,

		WildJokerRanked: false,
		SameSuitRuns:    tts.Config.SameSuitRuns,
		AceHigh:         tts.Config.AceHigh,
		AceLow:          !tts.Config.AceHigh,
		RunsWrap:        false,
	}
}

func (tts *ThreeThirteenState) ScoreByGroups(player int, groups [][]int, leftover []int) error {
	if player < 0 || player >= len(tts.Players) {
		return errors.New("not a valid player identifier: " + strconv.Itoa(player))
	}

	gs := tts.GinSolver()

	cards := make(map[int]bool)
	ncards := 0

	for _, group := range groups {
		group_index := make([]int, 0)
		for _, cardID := range group {
			if _, ok := cards[cardID]; ok {
				return errors.New("card was used twice")
			}
			index, found := tts.Players[player].FindCard(cardID)
			if !found {
				return errors.New("unable to find card with specified identifier")
			}
			cards[cardID] = true
			group_index = append(group_index, index)
			ncards += 1
		}
		if !gs.IsValidGroup(tts.Players[player].Hand, group_index) {
			// XXX better error message: stringify the cards?
			return errors.New("not a valid grouping")
		}
	}

	score := 0
	for _, cardID := range leftover {
		if _, ok := cards[cardID]; ok {
			return errors.New("card was used twice")
		}
		index, found := tts.Players[player].FindCard(cardID)
		if !found {
			return errors.New("unable to find card with specified identifier")
		}
		cards[cardID] = true
		card := tts.Players[player].Hand[index]
		score += gs.PointValue[card.Rank]
		ncards += 1
	}

	if ncards != len(tts.Players[player].Hand) {
		return errors.New("some cards were missing from scoring")
	}

	ideal := gs.MinScore(tts.Players[player].Hand)
	if ideal < score {
		max_warnings := 3
		tts.Players[player].Warnings += 1
		if tts.Config.SuggestBetter {
			if tts.Players[player].Warnings < max_warnings {
				return errors.New("you can get a better score")
			} else if tts.Players[player].Warnings == max_warnings {
				return errors.New("you can get a better score! last chance")
			}
		}
	}
	// Note that `score` is indeed a valid score for this hand
	// so it is suprising if it is better than `ideal`!
	if ideal > score {
		log.Println("failed to compute minimum score for hand; got", score, "expected", ideal, "for cards", tts.Players[player].Hand)
	}

	tts.Players[player].Groups = groups
	tts.Players[player].Leftover = leftover

	return tts.ReportScore(player, score)
}

func (tts *ThreeThirteenState) ReportScore(player int, score int) error {
	if !tts.Started {
		return errors.New("game hasn't started yet")
	}

	if tts.Finished {
		return errors.New("game has already finished")
	}

	if player < 0 || player >= len(tts.Players) {
		return errors.New("not a valid player identifier: " + strconv.Itoa(player))
	}

	if !tts.Dealt {
		return errors.New("unable to report score before dealing cards")
	}

	if tts.Players[player].Drawn != nil {
		return errors.New("unable to report score before discarding")
	}

	if tts.LaidDown == -1 {
		return errors.New("unable to report score until you've discarded")
	}

	tts.Players[player].RoundScore = score

	all_in := true
	for player_index, player := range tts.Players {
		if player.RoundScore == -1 {
			tts.Turn = player_index
			all_in = false
			break
		}
	}

	history := tts.RoundHistory[len(tts.RoundHistory)-1]

	if all_in {
		max_score := tts.Players[0].Score

		history.Discard = make([]*Card, len(tts.Discard))
		copy(history.Discard, tts.Discard)

		if tts.Config.GolfScoring {
			// When golfing, add everyones' score to themselves. Lowest score wins.
			for index := range tts.Players {
				tts.Players[index].Score += tts.Players[index].RoundScore

				if tts.Players[index].Score > max_score {
					max_score = tts.Players[index].Score
				}
			}
		} else {
			// Otherwise, the player who goes out gets the sum of others' scores.
			for index := range tts.Players {
				tts.Players[tts.LaidDown].Score += tts.Players[index].RoundScore
			}

			max_score = tts.Players[tts.LaidDown].Score
		}

		// Save round history, correctly! This must be done after score is
		// calculated but before we exit.
		for index := range tts.Players {
			history.Players[index].RoundScore = tts.Players[index].RoundScore
			history.Players[index].Score = tts.Players[index].Score
			history.Players[index].FinalHand = make([]Card, len(tts.Players[index].Hand))
			copy(history.Players[index].FinalHand, tts.Players[index].Hand)
			history.Players[index].Groups = tts.Players[index].Groups
			history.Players[index].Leftover = tts.Players[index].Leftover
		}

		if tts.Config.ToPointLimit != -1 && max_score >= tts.Config.ToPointLimit {
			tts.AssignWinner()
			return errors.New(ThreeThirteenGameOver)
		}

		// Figure out how many cards we need per player in the worst case; this is
		// the maximum round value.
		max_round := 13
		if tts.Config.WithFourteenthRound {
			max_round = 14
		}

		if tts.Round+1 > max_round {
			tts.AssignWinner()
			return errors.New(ThreeThirteenGameOver)
		}

		tts.Dealer = (tts.Dealer + 1) % len(tts.Players)
		tts.Dealt = false
		tts.LaidDown = -1
		return errors.New(ThreeThirteenNextRound)
	}

	return nil
}

func (tts *ThreeThirteenState) AssignWinner() {
	if tts.Config.GolfScoring {
		min_score := tts.Players[0].Score
		winner := 0

		for index := range tts.Players {
			if tts.Players[index].Score < min_score {
				min_score = tts.Players[index].Score
				winner = index
			}
		}

		if min_score == tts.Players[tts.LaidDown].Score && winner != tts.LaidDown {
			winner = tts.LaidDown
		}
		tts.Winner = winner
		tts.Dealer = -1
		tts.Turn = -1
		tts.Finished = true

		return
	}

	max_score := tts.Players[0].Score
	winner := 0

	for index := range tts.Players {
		if tts.Players[index].Score > max_score {
			max_score = tts.Players[index].Score
			winner = index
		}
	}

	if max_score == tts.Players[tts.LaidDown].Score && winner != tts.LaidDown {
		winner = tts.LaidDown
	}
	tts.Winner = winner
	tts.Finished = true
}
