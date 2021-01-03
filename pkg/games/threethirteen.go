package games

import (
	"errors"
	"log"
	"reflect"
	"strconv"
)

const ThreeThirteenGameOver string = "game is over"
const ThreeThirteenNextRound string = "begin next round"

type ThreeThirteenPlayer struct {
	Hand []Card `json:"hand"`

	Drawn           *Card `json:"drawn"`
	PickedUpDiscard bool  `json:"picked_up_discard"`
	RoundScore      int   `json:"round_score"`

	Score int `json:"score"`
}

func (ttp *ThreeThirteenPlayer) Init() {
	ttp.Hand = make([]Card, 0)
	ttp.Drawn = nil
}

func (ttp *ThreeThirteenPlayer) FindCard(cardID int) (int, bool) {
	for index, card := range ttp.Hand {
		if card.ID == cardID {
			return index, true
		}
	}

	return -1, false
}

func (ttp *ThreeThirteenPlayer) RemoveCard(cardID int) bool {
	index, found := ttp.FindCard(cardID)
	if !found {
		return false
	}

	var remaining []Card
	if index > 0 {
		remaining = ttp.Hand[:index]
	}
	remaining = append(remaining, ttp.Hand[index+1:]...)
	ttp.Hand = remaining

	return true
}

type ThreeThirteenConfig struct {
	NumPlayers int `json:"num_players"` // 1 <= n <= 15; best with four-ish.

	MinDrawSize int  `json:"min_draw_size"` // 13 <= n <= 40; minimum card count overhead per player -- used when calculating number of decks to use. Best with 7ish.
	AddJokers   bool `json:"add_jokers"`    // Add jokers as a permanent wild cards, two per deck used.

	AllowMostlyWild   bool `json:"allow_mostly_wild"`    // Allow groupings to have more wild cards than non-wild cards.
	AllowAllWildCards bool `json:"allow_all_wild_cards"` // Whether or not to allow a grouping of all wild cards.
	SameSuitRuns      bool `json:"same_suit_runs"`       // Whether runs have to be of the same suit.

	LayingDownLimit     int  `json:"laying_down_limit"`     // 0 <= n <= 20. Number of points remaining in hand to lay down.
	AllowBigGin         bool `json:"allow_big_gin"`         // Whether to allow laying down without discarding.
	WithFourteenthRound bool `json:"with_fourteenth_round"` // Whether to add an additional round without numbered wilds.

	ToPointLimit int  `json:"to_point_limit"` // -1 or 50 <= n <= 250. Whether to have a point limit to end the game early.
	GolfScoring  bool `json:"golf_scoring"`   // Whether least points win or most points win (different scoring mechanism).
}

func (cfg ThreeThirteenConfig) Validate() error {
	if cfg.NumPlayers < 1 || cfg.NumPlayers > 15 {
		return GameConfigError{"number of players", strconv.Itoa(cfg.NumPlayers), "between 1 and 6"}
	}

	if cfg.MinDrawSize < 13 || cfg.MinDrawSize > 40 {
		return GameConfigError{"minimum draw size", strconv.Itoa(cfg.MinDrawSize), "between 13 and 40"}
	}

	if cfg.LayingDownLimit < 0 || cfg.LayingDownLimit > 20 {
		return GameConfigError{"laying down limit", strconv.Itoa(cfg.LayingDownLimit), "between 0 and 20"}
	}

	if cfg.ToPointLimit != -1 && (cfg.ToPointLimit < 50 || cfg.ToPointLimit > 250) {
		return GameConfigError{"ending point limit", strconv.Itoa(cfg.LayingDownLimit), "-1 or between 50 and 250"}
	}

	return nil
}

func (cfg *ThreeThirteenConfig) LoadConfig(wire map[string]interface{}) error {
	if wire_value, ok := wire["num_players"]; ok {
		if num_players, ok := wire_value.(float64); ok {
			cfg.NumPlayers = int(num_players)
		} else {
			return errors.New("unable to parse value for num_players as integer: " + reflect.TypeOf(wire_value).String())
		}
	}

	if wire_value, ok := wire["min_draw_size"]; ok {
		if min_draw_size, ok := wire_value.(float64); ok {
			cfg.MinDrawSize = int(min_draw_size)
		} else {
			return errors.New("unable to parse value for min_draw_size as integer: " + reflect.TypeOf(wire_value).String())
		}
	}

	if wire_value, ok := wire["add_jokers"]; ok {
		if add_jokers, ok := wire_value.(bool); ok {
			cfg.AddJokers = add_jokers
		} else {
			return errors.New("unable to parse value for add_jokers as boolean: " + reflect.TypeOf(wire_value).String())
		}
	}

	if wire_value, ok := wire["allow_mostly_wild"]; ok {
		if allow_mostly_wild, ok := wire_value.(bool); ok {
			cfg.AllowMostlyWild = allow_mostly_wild
		} else {
			return errors.New("unable to parse value for allow_mostly_wild as boolean: " + reflect.TypeOf(wire_value).String())
		}
	}

	if wire_value, ok := wire["allow_all_wild_cards"]; ok {
		if allow_all_wild_cards, ok := wire_value.(bool); ok {
			cfg.AllowAllWildCards = allow_all_wild_cards
		} else {
			return errors.New("unable to parse value for allow_all_wild_cards as boolean: " + reflect.TypeOf(wire_value).String())
		}
	}

	if wire_value, ok := wire["same_suit_runs"]; ok {
		if same_suit_runs, ok := wire_value.(bool); ok {
			cfg.SameSuitRuns = same_suit_runs
		} else {
			return errors.New("unable to parse value for same_suit_runs as boolean: " + reflect.TypeOf(wire_value).String())
		}
	}

	if wire_value, ok := wire["laying_down_limit"]; ok {
		if laying_down_limit, ok := wire_value.(float64); ok {
			cfg.LayingDownLimit = int(laying_down_limit)
		} else {
			return errors.New("unable to parse value for laying_down_limit as integer: " + reflect.TypeOf(wire_value).String())
		}
	}

	if wire_value, ok := wire["allow_big_gin"]; ok {
		if allow_big_gin, ok := wire_value.(bool); ok {
			cfg.AllowBigGin = allow_big_gin
		} else {
			return errors.New("unable to parse value for allow_big_gin as boolean: " + reflect.TypeOf(wire_value).String())
		}
	}

	if wire_value, ok := wire["with_fourteenth_round"]; ok {
		if with_fourteenth_round, ok := wire_value.(bool); ok {
			cfg.WithFourteenthRound = with_fourteenth_round
		} else {
			return errors.New("unable to parse value for with_fourteenth_round as boolean: " + reflect.TypeOf(wire_value).String())
		}
	}

	if wire_value, ok := wire["to_point_limit"]; ok {
		if to_point_limit, ok := wire_value.(float64); ok {
			cfg.ToPointLimit = int(to_point_limit)
		} else {
			return errors.New("unable to parse value for to_point_limit as integer: " + reflect.TypeOf(wire_value).String())
		}
	}

	if wire_value, ok := wire["golf_scoring"]; ok {
		if golf_scoring, ok := wire_value.(bool); ok {
			cfg.GolfScoring = golf_scoring
		} else {
			return errors.New("unable to parse value for golf_scoring as boolean: " + reflect.TypeOf(wire_value).String())
		}
	}

	return nil
}

type ThreeThirteenRoundPlayer struct {
	DealtHand []Card `json:"dealt_hand"`
	FinalHand []Card `json:"final_hand"`

	RoundScore int `json:"round_score"`
	Score      int `json:"score"`
}

type ThreeThirteenTurn struct {
	Player int `json:"player"`

	Drawn       Card `json:"drawn"`
	FromDiscard bool `json:"from_discard"`
	Discarded   Card `json:"discarded"`

	StartingHand []Card `json:"starting_hand"`
	EndingHand   []Card `json:"ending_hand"`
}

type ThreeThirteenRound struct {
	Size   int `json:"size"`
	Dealer int `json:"dealer"`
	Leader int `json:"leader"`

	Players []ThreeThirteenRoundPlayer `json:"players"`
	Turns   []ThreeThirteenTurn        `json:"plays"`
}

type ThreeThirteenState struct {
	Turn   int `json:"turn"`
	Dealer int `json:"dealer"`

	Deck    Deck                  `json:"deck"`
	Discard []*Card               `json:"discard"`
	Players []ThreeThirteenPlayer `json:"players"` // Left of dealer is found by incrementing one.
	Round   int                   `json:"round"`

	Config ThreeThirteenConfig `json:"config"`

	Started  bool `json:"started"`
	Dealt    bool `json:"dealt"`
	LaidDown int  `json:"laid_down"`
	Finished bool `json:"finished"`

	Winner int `json:"winner"`
}

func (tts *ThreeThirteenState) Init(cfg ThreeThirteenConfig) error {
	var err error = cfg.Validate()
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

func (tts *ThreeThirteenState) ReInit() error {
	// No-op for now. Nothing needs to be re-initialized after reloading
	// from JSON serialization.
	return nil
}

func (tts *ThreeThirteenState) Start(players int) error {
	var err error

	if tts.Started {
		log.Println("Error! Double start occurred...", err)
		return errors.New("double start occurred")
	}

	tts.Config.NumPlayers = players
	err = tts.Config.Validate()
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

	// Clear out all round-specific status before each round.
	for index := range tts.Players {
		tts.Players[index].Hand = make([]Card, 0)
		tts.Players[index].Drawn = nil
		tts.Players[index].PickedUpDiscard = false
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

	if FromDiscard {
		if len(tts.Discard) == 0 {
			return errors.New("unable to draw with no more cards remaining")
		}

		tts.Players[player].Drawn = tts.Discard[len(tts.Discard)-1]
		tts.Discard = tts.Discard[:len(tts.Discard)-1]
	} else {
		if len(tts.Deck.Cards) == 0 {
			return errors.New("unable to draw with no more cards remaining")
		}

		tts.Players[player].Drawn = tts.Deck.Cards[0]
		tts.Deck.Cards = tts.Deck.Cards[1:]
	}
	tts.Players[player].PickedUpDiscard = FromDiscard

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

	if cardID == tts.Players[player].Drawn.ID && tts.Players[player].PickedUpDiscard && tts.LaidDown == -1 {
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

	// Unlike in LayDown, we still advance the turn below. This isn't really
	// necessary, but simplifies the code.

	if cardID == tts.Players[player].Drawn.ID {
		// They must've taken the top card. Discard it and advance the turn.
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
	tts.Discard = append(tts.Discard, tts.Players[player].Hand[index].Copy())
	tts.Players[player].RemoveCard(cardID)

	// Add the drawn card into the hand.
	tts.Players[player].Hand = append(tts.Players[player].Hand, *tts.Players[player].Drawn)
	tts.Players[player].Drawn = nil

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

	if len(tts.Deck.Cards) >= len(tts.Players)-1 {
		for player_offset := 1; player_offset < len(tts.Players); player_offset++ {
			player_index := (player + player_offset) % len(tts.Players)
			tts.Players[player_index].Drawn = tts.Deck.Cards[0]
			tts.Deck.Cards = tts.Deck.Cards[1:]
			tts.Turn = player_index
		}
	}
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
	for _, player := range tts.Players {
		if player.RoundScore == -1 {
			all_in = false
			break
		}
	}

	if all_in {
		max_score := tts.Players[0].Score

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
