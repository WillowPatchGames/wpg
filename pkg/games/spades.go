package games

import (
	"errors"
	"log"
	"reflect"
	"strconv"
)

const SpadesGameOver string = "game is over"
const SpadesNextRound string = "begin next round"

// SpadesBid describes the bid for a single player in spades. This is a
// proxy for using string identifiers and is strongly typed instead.
type SpadesBid int

const (
	NotBidSpades         SpadesBid = iota // 0
	OneBidSpades         SpadesBid = iota // 1
	TwoBidSpades         SpadesBid = iota // 2
	ThreeBidSpades       SpadesBid = iota // 3
	FourBidSpades        SpadesBid = iota // 4
	FiveBidSpades        SpadesBid = iota // 5
	SixBidSpades         SpadesBid = iota // 6
	SevenBidSpades       SpadesBid = iota // 7
	EightBidSpades       SpadesBid = iota // 8
	NineBidSpades        SpadesBid = iota // 9
	TenBidSpades         SpadesBid = iota // 10
	ElevenBidSpades      SpadesBid = iota // 11
	TwelveBidSpades      SpadesBid = iota // 12
	ThirteenBidSpades    SpadesBid = iota // 13
	FourteenBidSpades    SpadesBid = iota // 14
	FifteenBidSpades     SpadesBid = iota // 15
	SixteenBidSpades     SpadesBid = iota // 16
	SeventeenBidSpades   SpadesBid = iota // 17
	EighteenBidSpades    SpadesBid = iota // 18
	NilBidSpades         SpadesBid = iota // 19
	BlindNilBidSpades    SpadesBid = iota // 20
	TripleNilBidSpades   SpadesBid = iota // 21
	OutOfBoundsBidSpades SpadesBid = iota // 22
)

type SpadesPlayer struct {
	Hand []Card `json:"hand"`

	Drawn  *Card     `json:"drawn"`
	Peeked bool      `json:"peeked"`
	Bid    SpadesBid `json:"bid"`
	Tricks int       `json:"tricks"`

	Score     int `json:"score"`
	Overtakes int `json:"overtakes"`
}

func (sp *SpadesPlayer) Init() {
	sp.Hand = make([]Card, 0)
}

func (sp *SpadesPlayer) FindCard(cardID int) (int, bool) {
	for index, card := range sp.Hand {
		if card.ID == cardID {
			return index, true
		}
	}

	return -1, false
}

type SpadesConfig struct {
	NumPlayers      int  `json:"num_players"`       // 2 <= n <= 6; best with four.
	Overtakes       bool `json:"overtakes"`         // No overtakes at all.
	OvertakeLimit   int  `json:"overtake_limit"`    // 2 <= n <= 15. Number of overtakes before a penalty.
	MustBreakSpades bool `json:"must_break_spades"` // Whether spades need to be broken before they can be lead.
	AddJokers       bool `json:"add_jokers"`        // For three or six players: add jokers to round off the number of cards. Otherwise, one card will be left in the deck with three players, or the twos will be removed with six.
	FirstWins       bool `json:"first_wins"`        // For six players: whether the first or the last card played wins in case of a tie in value.
	WithPartners    bool `json:"with_partners"`     // For four or six players: whether to play with partners.
	FullHistory     bool `json:"full_history"`      // Whether or not to allow peeking at past rounds.

	// Nil
	WithNil        bool `json:"with_nil"`         // Allow nil bids.
	OvertakesNil   bool `json:"overtakes_nil"`    // Overtakes count when you or your partner bids nil.
	BlindBidding   bool `json:"blind_bidding"`    // Allow "blind" bidding.
	WithDoubleNil  bool `json:"with_double_nil"`  // When true and both players bid nil, both must make it.
	WithBreakBonus bool `json:"with_break_bonus"` // Breaking both double nil players grants a bonus to the breakers.
	WithTripleNil  bool `json:"with_triple_nil"`  // A variation of blind nil, wherein the player may only choose which suit to play.

	// Scoring
	WinAmount       int  `json:"win_amount"`       // 50 <= n <= 1000.
	OvertakePenalty int  `json:"overtake_penalty"` // n in {50, 100, 150, 200}.
	TrickMultipler  int  `json:"trick_multipler"`  // n in {5, 10}.
	MoonOrBoston    bool `json:"perfect_round"`    // Score half of the win amount for a perfect round (taking all tricks tricks).
	NilScore        int  `json:"nil_score"`        // n in {50, 75. 100, 125, 150, 200}.
}

func (cfg SpadesConfig) Validate() error {
	if cfg.NumPlayers < 2 || cfg.NumPlayers > 6 {
		return GameConfigError{"number of players", strconv.Itoa(cfg.NumPlayers), "between 2 and 6"}
	}

	if cfg.WinAmount < 50 || cfg.WinAmount > 1000 {
		return GameConfigError{"winning score", strconv.Itoa(cfg.WinAmount), "between 50 and 1000"}
	}

	// XXX: Validate more configuration options.

	return nil
}

func (cfg *SpadesConfig) LoadConfig(wire map[string]interface{}) error {
	if wire_value, ok := wire["num_players"]; ok {
		if num_players, ok := wire_value.(float64); ok {
			cfg.NumPlayers = int(num_players)
		} else {
			return errors.New("unable to parse value for num_players as integer: " + reflect.TypeOf(wire_value).String())
		}
	}

	if wire_value, ok := wire["overtakes"]; ok {
		if overtakes, ok := wire_value.(bool); ok {
			cfg.Overtakes = overtakes
		} else {
			return errors.New("unable to parse value for overtakes as boolean: " + reflect.TypeOf(wire_value).String())
		}
	}

	if wire_value, ok := wire["overtake_limit"]; ok {
		if overtake_limit, ok := wire_value.(float64); ok {
			cfg.OvertakeLimit = int(overtake_limit)
		} else {
			return errors.New("unable to parse value for overtake_limit as integer: " + reflect.TypeOf(wire_value).String())
		}
	}

	if wire_value, ok := wire["must_break_spades"]; ok {
		if must_break_spades, ok := wire_value.(bool); ok {
			cfg.MustBreakSpades = must_break_spades
		} else {
			return errors.New("unable to parse value for must_break_spades as boolean: " + reflect.TypeOf(wire_value).String())
		}
	}

	if wire_value, ok := wire["add_jokers"]; ok {
		if add_jokers, ok := wire_value.(bool); ok {
			cfg.AddJokers = add_jokers
		} else {
			return errors.New("unable to parse value for add_jokers as boolean: " + reflect.TypeOf(wire_value).String())
		}
	}

	if wire_value, ok := wire["first_wins"]; ok {
		if first_wins, ok := wire_value.(bool); ok {
			cfg.FirstWins = first_wins
		} else {
			return errors.New("unable to parse value for first_wins as boolean: " + reflect.TypeOf(wire_value).String())
		}
	}

	if wire_value, ok := wire["with_partners"]; ok {
		if with_partners, ok := wire_value.(bool); ok {
			cfg.WithPartners = with_partners
		} else {
			return errors.New("unable to parse value for with_partners as boolean: " + reflect.TypeOf(wire_value).String())
		}
	}

	if wire_value, ok := wire["full_history"]; ok {
		if full_history, ok := wire_value.(bool); ok {
			cfg.FullHistory = full_history
		} else {
			return errors.New("unable to parse value for full_history as boolean: " + reflect.TypeOf(wire_value).String())
		}
	}

	if wire_value, ok := wire["with_nil"]; ok {
		if with_nil, ok := wire_value.(bool); ok {
			cfg.WithNil = with_nil
		} else {
			return errors.New("unable to parse value for with_nil as boolean: " + reflect.TypeOf(wire_value).String())
		}
	}

	if wire_value, ok := wire["overtakes_nil"]; ok {
		if overtakes_nil, ok := wire_value.(bool); ok {
			cfg.OvertakesNil = overtakes_nil
		} else {
			return errors.New("unable to parse value for overtakes_nil as boolean: " + reflect.TypeOf(wire_value).String())
		}
	}

	if wire_value, ok := wire["blind_bidding"]; ok {
		if blind_bidding, ok := wire_value.(bool); ok {
			cfg.BlindBidding = blind_bidding
		} else {
			return errors.New("unable to parse value for blind_bidding as boolean: " + reflect.TypeOf(wire_value).String())
		}
	}

	if wire_value, ok := wire["with_double_nil"]; ok {
		if with_double_nil, ok := wire_value.(bool); ok {
			cfg.WithDoubleNil = with_double_nil
		} else {
			return errors.New("unable to parse value for with_double_nil as boolean: " + reflect.TypeOf(wire_value).String())
		}
	}

	if wire_value, ok := wire["with_break_bonus"]; ok {
		if with_break_bonus, ok := wire_value.(bool); ok {
			cfg.WithBreakBonus = with_break_bonus
		} else {
			return errors.New("unable to parse value for with_break_bonus as boolean: " + reflect.TypeOf(wire_value).String())
		}
	}

	if wire_value, ok := wire["with_triple_nil"]; ok {
		if with_triple_nil, ok := wire_value.(bool); ok {
			cfg.WithTripleNil = with_triple_nil
		} else {
			return errors.New("unable to parse value for with_triple_nil as boolean: " + reflect.TypeOf(wire_value).String())
		}
	}

	if wire_value, ok := wire["win_amount"]; ok {
		if win_amount, ok := wire_value.(float64); ok {
			cfg.WinAmount = int(win_amount)
		} else {
			return errors.New("unable to parse value for win_amount as integer: " + reflect.TypeOf(wire_value).String())
		}
	}

	if wire_value, ok := wire["overtake_penalty"]; ok {
		if overtake_penalty, ok := wire_value.(float64); ok {
			cfg.OvertakePenalty = int(overtake_penalty)
		} else {
			return errors.New("unable to parse value for overtake_penalty as integer: " + reflect.TypeOf(wire_value).String())
		}
	}

	if wire_value, ok := wire["trick_multipler"]; ok {
		if trick_multipler, ok := wire_value.(float64); ok {
			cfg.TrickMultipler = int(trick_multipler)
		} else {
			return errors.New("unable to parse value for trick_multipler as integer: " + reflect.TypeOf(wire_value).String())
		}
	}

	if wire_value, ok := wire["perfect_round"]; ok {
		if perfect_round, ok := wire_value.(bool); ok {
			cfg.MoonOrBoston = perfect_round
		} else {
			return errors.New("unable to parse value for perfect_round as boolean: " + reflect.TypeOf(wire_value).String())
		}
	}

	if wire_value, ok := wire["nil_score"]; ok {
		if nil_score, ok := wire_value.(float64); ok {
			cfg.NilScore = int(nil_score)
		} else {
			return errors.New("unable to parse value for nil_score as integer: " + reflect.TypeOf(wire_value).String())
		}
	}

	return nil
}

type SpadesTrick struct {
	Leader int    `json:"leader"`
	Trick  []Card `json:"trick"`
	Winner int    `json:"winner"`
}

type SpadesRoundPlayer struct {
	Hand []Card `json:"hand"`

	Bid       SpadesBid `json:"bid"`
	Tricks    int       `json:"tricks"`
	Score     int       `json:"score"`
	Overtakes int       `json:"overtakes"`
}

type SpadesRound struct {
	Dealer  int                 `json:"dealer"`
	Players []SpadesRoundPlayer `json:"players"`
	Tricks  []SpadesTrick       `json:"tricks"`
}

type SpadesState struct {
	Turn   int `json:"turn"`
	Leader int `json:"leader"`
	Dealer int `json:"dealer"`

	Deck           Deck           `json:"deck"`
	Players        []SpadesPlayer `json:"players"`         // Left of dealer is found by incrementing one.
	Played         []Card         `json:"played"`          // Currently played cards in this round.
	SpadesBroken   bool           `json:"spades_broken"`   // Whether or not spades have been broken.
	PreviousTricks [][]Card       `json:"previous_tricks"` // Contents of previous tricks in the current round; sent to clients.
	RoundHistory   []SpadesRound  `json:"round_history"`   // Contents of previous rounds for analysis.

	Config SpadesConfig `json:"config"`

	Started bool `json:"started"`
	Dealt   bool `json:"dealt"`
	Bid     bool `json:"bid"`

	Finished bool `json:"finished"`
	Winner   int  `json:"winner"`
}

func (ss *SpadesState) Init(cfg SpadesConfig) error {
	var err error = cfg.Validate()
	if err != nil {
		log.Println("Error with SpadesConfig", err)
		return err
	}

	ss.Config = cfg
	ss.Turn = -1
	ss.Dealer = -1
	ss.Started = false
	ss.Finished = false
	ss.Winner = -1

	return nil
}

func (ss *SpadesState) ReInit() error {
	// No-op for now. Nothing needs to be re-initialized after reloading
	// from JSON serialization.
	return nil
}

func (ss *SpadesState) Start(players int) error {
	var err error

	if ss.Started {
		log.Println("Error! Double start occurred...", err)
		return errors.New("double start occurred")
	}

	ss.Config.NumPlayers = players
	err = ss.Config.Validate()
	if err != nil {
		log.Println("Err with SpadesConfig after starting: ", err)
		return err
	}

	// Create all of the players.
	ss.Players = make([]SpadesPlayer, ss.Config.NumPlayers)
	for _, player := range ss.Players {
		player.Init()
	}

	// Force us to call StartRound() next.
	ss.Dealt = false
	ss.Bid = false
	ss.Dealer = 0

	// Start the round: shuffle the cards and (if necessary) deal them out.
	err = ss.StartRound()
	if err != nil {
		log.Println("Error starting round: ", err)
		return err
	}

	ss.Started = true
	return nil
}

func (ss *SpadesState) StartRound() error {
	// Invariants: unless otherwise overridden below, start with dealt = false
	// and bid = false -- this means we still need to deal out the cards before
	// we begin.
	ss.Dealt = false
	ss.Bid = false
	ss.Bid = false
	ss.SpadesBroken = false

	// Start with a clean deck and shuffle it.
	ss.Deck.Init()
	ss.Deck.AddStandard52Deck()
	if ss.Config.NumPlayers == 3 {
		if ss.Config.AddJokers {
			ss.Deck.AddJokers(1, true)
			ss.Deck.AddJokers(1, false)
		}
	} else if ss.Config.NumPlayers == 5 {
		found := ss.Deck.RemoveCard(TwoRank, DiamondsSuit)
		if !found {
			log.Println("Error! Expected two of diamonds in standard deck, but wasn't found")
			return errors.New("bad deck of cards; no two of diamonds to remove")
		}

		found = ss.Deck.RemoveCard(TwoRank, HeartsSuit)
		if !found {
			log.Println("Error! Expected two of hearts in standard deck, but wasn't found")
			return errors.New("bad deck of cards; no two of hearts to remove")
		}
	} else if ss.Config.NumPlayers == 6 {
		// Six player spades requires an extra deck...
		ss.Deck.AddStandard52Deck()

		// And either remove both two of clubs, or add four more jokers.
		if !ss.Config.AddJokers {
			found := ss.Deck.RemoveCard(TwoRank, ClubsSuit)
			if !found {
				log.Println("Error! Expected one two of clubs in standard deck, but wasn't found")
				return errors.New("bad deck of cards; no two of clubs to remove")
			}

			found = ss.Deck.RemoveCard(TwoRank, ClubsSuit)
			if !found {
				log.Println("Error! Expected one two of clubs in standard deck, but wasn't found")
				return errors.New("bad deck of cards; no two of clubs to remove")
			}
		} else {
			ss.Deck.AddJokers(4, false)
		}
	}

	// Shuffling the deck assigns cards to each player.
	ss.Deck.Shuffle()

	// Clear out all round-specific status before each round.
	for index := range ss.Players {
		ss.Players[index].Drawn = nil
		ss.Players[index].Bid = NotBidSpades
		ss.Players[index].Peeked = !ss.Config.BlindBidding || ss.Config.NumPlayers == 2
		ss.Players[index].Tricks = 0
		ss.Players[index].Hand = make([]Card, 0)
	}
	ss.Played = make([]Card, 0)

	// We don't deal cards out when playing with two players; exit early.
	if ss.Config.NumPlayers == 2 {
		// When we have two players, the first step of play is dealing out the
		// cards with player involvement; exit without setting Dealt to true.
		ss.Turn = ss.Dealer
		return nil
	}

	// Deal out all cards. Start with the player left of the dealer.
	starting_player := (ss.Dealer + 1) % len(ss.Players)
	for len(ss.Deck.Cards) >= len(ss.Players) {
		for player_offset := 0; player_offset < len(ss.Players); player_offset++ {
			player_index := (starting_player + player_offset) % len(ss.Players)
			ss.Players[player_index].Hand = append(ss.Players[player_index].Hand, *ss.Deck.Cards[0])
			ss.Deck.Cards = ss.Deck.Cards[1:]
		}
	}

	// The first person to play is the one left of the dealer.
	ss.Turn = starting_player
	ss.Dealt = true

	return nil
}

// Two player only. Peek at the top card; placed in player.Drawn.
func (ss *SpadesState) PeekTop(player int) error {
	if !ss.Started {
		return errors.New("game hasn't started yet")
	}

	if ss.Finished {
		return errors.New("game has already finished")
	}

	if player < 0 || player >= len(ss.Players) {
		return errors.New("not a valid player identifier: " + strconv.Itoa(player))
	}

	if ss.Turn != player {
		return errors.New("not your turn")
	}

	if ss.Config.NumPlayers != 2 {
		log.Println("Error! DrawTop called when more than two players:", ss.Config.NumPlayers)
		return errors.New("invalid call: more than two players")
	}

	if len(ss.Deck.Cards) == 0 {
		ss.Dealt = true
		return errors.New("invalid state: no more cards to draw")
	}

	if ss.Players[player].Drawn != nil {
		return errors.New("already have picked up a card; decide whether to keep or discard it")
	}

	ss.Players[player].Drawn = ss.Deck.Cards[0]
	ss.Deck.Cards = ss.Deck.Cards[1:]
	return nil
}

// Two player only. Conditionally discard the peeked card and take the other.
func (ss *SpadesState) DecideTop(player int, keep bool) error {
	if !ss.Started {
		return errors.New("game hasn't started yet")
	}

	if ss.Finished {
		return errors.New("game has already finished")
	}

	if player < 0 || player >= len(ss.Players) {
		return errors.New("not a valid player identifier: " + strconv.Itoa(player))
	}

	if ss.Turn != player {
		return errors.New("not your turn")
	}

	if ss.Config.NumPlayers != 2 {
		log.Println("Error! DrawTop called when more than two players:", ss.Config.NumPlayers)
		return errors.New("invalid call: more than two players")
	}

	if len(ss.Deck.Cards) == 0 {
		ss.Dealt = true
		return errors.New("invalid state: no more cards to draw")
	}

	if ss.Players[player].Drawn == nil {
		return errors.New("need to pick up a card first")
	}

	if keep {
		// Keep the card we peeked at and discard the rest.
		ss.Players[player].Hand = append(ss.Players[player].Hand, *ss.Players[player].Drawn)
		ss.Deck.Cards = ss.Deck.Cards[1:]
	} else {
		ss.Players[player].Hand = append(ss.Players[player].Hand, *ss.Deck.Cards[0])
		ss.Deck.Cards = ss.Deck.Cards[1:]
	}

	ss.Players[player].Drawn = nil
	ss.Turn = (ss.Turn + 1) % ss.Config.NumPlayers
	ss.Dealt = len(ss.Deck.Cards) < 2
	if ss.Dealt {
		// Oddly, with two player spades, the dealer starts by taking a card, but
		// the other player bids first. Correct the offset if all the cards have
		// been dealt.
		ss.Turn = (ss.Dealer + 1) % ss.Config.NumPlayers
	}
	return nil
}

func (ss *SpadesState) PeekCards(player int) error {
	if !ss.Started {
		return errors.New("game hasn't started yet")
	}

	if ss.Finished {
		return errors.New("game has already finished")
	}

	if player < 0 || player >= len(ss.Players) {
		return errors.New("not a valid player identifier: " + strconv.Itoa(player))
	}

	if !ss.Dealt {
		return errors.New("unable to peek before dealing cards")
	}

	if ss.Bid {
		return errors.New("already bid; must've already peeked")
	}

	ss.Players[player].Peeked = true
	return nil
}

func (ss *SpadesState) PlaceBid(player int, bid SpadesBid) error {
	if !ss.Started {
		return errors.New("game hasn't started yet")
	}

	if ss.Finished {
		return errors.New("game has already finished")
	}

	if player < 0 || player >= len(ss.Players) {
		return errors.New("not a valid player identifier: " + strconv.Itoa(player))
	}

	if ss.Turn != player {
		return errors.New("not your turn")
	}

	if !ss.Dealt {
		return errors.New("unable to peek before dealing cards")
	}

	if ss.Bid {
		return errors.New("already bid; can't bid again")
	}

	if bid == NotBidSpades {
		return errors.New("can't skip bidding")
	}

	if bid == NilBidSpades && !ss.Config.WithNil {
		return errors.New("can't bid nil when not enabled by config")
	}

	if bid == BlindNilBidSpades && (!ss.Config.WithDoubleNil || !ss.Config.BlindBidding) {
		return errors.New("can't bid blind nil when not enabled by config")
	}

	if bid == TripleNilBidSpades && (!ss.Config.WithTripleNil || !ss.Config.BlindBidding) {
		return errors.New("can't bid triple nil when not enabled by config")
	}

	if (bid == BlindNilBidSpades || bid == TripleNilBidSpades) && ss.Players[player].Peeked {
		return errors.New("can't bid blind or triple nil when you've peeked at your cards")
	}

	if ss.Config.NumPlayers == 2 || ss.Config.NumPlayers == 4 {
		if bid >= FourteenBidSpades && bid <= EighteenBidSpades {
			return errors.New("can't bid above thirteen with this number of players")
		}
	} else if ss.Config.NumPlayers == 3 || ss.Config.NumPlayers == 6 {
		if bid == EighteenBidSpades && !ss.Config.AddJokers {
			return errors.New("can't bid eighteen without adding jokers")
		}
	} else if ss.Config.NumPlayers == 5 {
		if bid >= ElevenBidSpades && bid <= EighteenBidSpades {
			return errors.New("can't bid above ten with this number of players")
		}
	}

	// Record the bid.
	ss.Players[player].Bid = bid

	// Also, allow players to look at their cards now.
	ss.Players[player].Peeked = true

	// By this point, two-player spades has synced back up with the remaining
	// variants so we can safely go from dealer -> left of dealer.

	// Dealer bids last.
	if ss.Turn == ss.Dealer {
		ss.Bid = true
	}

	ss.Turn = (ss.Turn + 1) % ss.Config.NumPlayers
	ss.Leader = ss.Turn
	return nil
}

func (ss *SpadesState) PlayCard(player int, card int) error {
	if !ss.Started {
		return errors.New("game hasn't started yet")
	}

	if ss.Finished {
		return errors.New("game has already finished")
	}

	if player < 0 || player >= len(ss.Players) {
		return errors.New("not a valid player identifier: " + strconv.Itoa(player))
	}

	if ss.Turn != player {
		return errors.New("not your turn")
	}

	if !ss.Dealt {
		return errors.New("unable to play a card before dealing cards")
	}

	if !ss.Bid {
		return errors.New("unable to play before bidding")
	}

	index, found := ss.Players[player].FindCard(card)
	if !found {
		return errors.New("unable to play card not in hand")
	}

	played := ss.Players[player].Hand[index]
	effectively_spade := played.Suit == SpadesSuit || played.Rank == JokerRank

	// Validate we can play this card first.
	if ss.Turn == ss.Leader {
		// If we're the leader, ensure either spades have been broken or this is
		// our only suit.
		if effectively_spade && !ss.SpadesBroken && ss.Config.MustBreakSpades {
			for _, card := range ss.Players[player].Hand {
				if card.Suit != SpadesSuit && card.Rank != JokerRank {
					// Have a non-Spade, non-Joker card we could've played instead.
					return errors.New("must sluff spades before spades can be lead")
				}
			}
			ss.SpadesBroken = true
		}
	} else {
		// Otherwise, ensure we follow the lead suit if we can.
		lead_suit := ss.Played[0].Suit
		lead_effectively_spade := lead_suit == SpadesSuit || ss.Played[0].Rank == JokerRank
		if lead_effectively_spade {
			lead_suit = SpadesSuit
		}

		if played.Suit != lead_suit {
			for _, card := range ss.Players[player].Hand {
				this_effectively_spade := card.Suit == SpadesSuit || card.Rank == JokerRank
				if card.Suit == lead_suit || (this_effectively_spade && lead_effectively_spade) {
					// Have a different card we could've played instead.
					return errors.New("must follow the lead suit")
				}
			}
		}

		if !ss.SpadesBroken && effectively_spade {
			// We've got a sluffer!
			ss.SpadesBroken = true
		}
	}

	var remaining []Card
	if index > 0 {
		remaining = ss.Players[player].Hand[:index]
	}
	remaining = append(remaining, ss.Players[player].Hand[index+1:]...)
	ss.Players[player].Hand = remaining
	ss.Played = append(ss.Played, played)

	ss.Turn = (ss.Turn + 1) % ss.Config.NumPlayers
	if ss.Turn == ss.Leader {
		// Got back to the player who started this trick. Determine a winner and
		// exit.
		return ss.determineTrickWinner()
	}

	return nil
}

func (ss *SpadesState) determineTrickWinner() error {
	var winner_offset = 0
	var winning_card = ss.Played[0]

	// Always have at least two players, so an offset of one is always valid.
	for offset := 1; offset < ss.Config.NumPlayers; offset++ {
		this_card := ss.Played[offset]
		if winning_card.Suit == this_card.Suit && this_card.Suit != NoneSuit && this_card.Suit != FancySuit {
			// Highest card of the lead suit wins. Or, when playing with six players,
			// choose the winner in case of tie according to config. Also, check for
			// aces, cuz they have integer value 1, but beat 2 and above... :)
			is_higher := this_card.Rank > winning_card.Rank && winning_card.Rank != AceRank
			won_due_to_tie := this_card.Rank == winning_card.Rank && !ss.Config.FirstWins
			is_ace_win := this_card.Rank == AceRank && winning_card.Rank != AceRank && winning_card.Rank != JokerRank
			if is_higher || won_due_to_tie || is_ace_win {
				winner_offset = offset
				winning_card = this_card
			}
		} else if this_card.Suit == SpadesSuit {
			if winning_card.Suit != SpadesSuit && winning_card.Rank != JokerRank {
				// Someone is winning with trump over here!
				winner_offset = offset
				winning_card = this_card
			}
		} else if this_card.Rank == JokerRank {
			was_not_joker := winning_card.Rank != JokerRank
			won_due_to_tie := this_card.Rank == winning_card.Rank && !ss.Config.FirstWins
			won_higher_joker := this_card.Rank == JokerRank && this_card.Suit == FancySuit
			if was_not_joker || won_due_to_tie || won_higher_joker {
				// We got a winning joker!
				winner_offset = offset
				winning_card = this_card
			}
		}
	}

	absolute_winner := (ss.Leader + winner_offset) % ss.Config.NumPlayers
	ss.Players[absolute_winner].Tricks += 1
	ss.Leader = absolute_winner
	ss.Turn = absolute_winner
	ss.PreviousTricks = append(ss.PreviousTricks, ss.Played)
	ss.Played = make([]Card, 0)

	if len(ss.Players[0].Hand) == 0 {
		// Can't play again in this round. Tabulate the round score and maybe try
		// to play another round.
		return ss.tabulateRoundScore()
	}

	return nil
}

func (ss *SpadesState) tabulateRoundScore() error {
	var max_count = ss.Config.NumPlayers
	if ss.Config.WithPartners && (ss.Config.NumPlayers == 4 || ss.Config.NumPlayers == 6) {
		max_count = ss.Config.NumPlayers / 2
	}

	// Update everyone's scores first.
	for player := 0; player < max_count; player++ {
		partner := (player + max_count) % ss.Config.NumPlayers
		have_partner := partner != player && ss.Config.WithPartners

		if !have_partner {
			// Everyone for themselves!
			score, overtakes := ss.scoreSingle(player)
			ss.Players[player].Score += score
			ss.Players[player].Overtakes = overtakes
		} else {
			score, overtakes := ss.scorePartnership(player, partner)
			ss.Players[player].Score += score
			ss.Players[player].Overtakes = overtakes
			ss.Players[partner].Score += score
			ss.Players[partner].Overtakes = overtakes
		}
	}

	var winner_offset = -1
	var winner_score = -1
	for player := 0; player < max_count; player++ {
		if ss.Players[player].Score >= ss.Config.WinAmount {
			if ss.Players[player].Score >= winner_score {
				winner_score = ss.Players[player].Score
				winner_offset = player
			}
		}
	}

	// If we have a winner, exit the game.
	if winner_offset != -1 {
		ss.Finished = true
		ss.Dealt = true
		ss.Bid = true
		return errors.New(SpadesGameOver)
	}

	ss.Dealer = (ss.Dealer + 1) % ss.Config.NumPlayers

	// Restart the round: shuffle the cards and (if necessary) deal them out.
	if err := ss.StartRound(); err != nil {
		log.Println("Error starting round: ", err)
		return err
	}

	return errors.New(SpadesNextRound)
}

// Calculate the score for a single player with no partnerships.
// Returns: score adjustment, total overtakes.
func (ss *SpadesState) scoreSingle(player int) (int, int) {
	bid := ss.Players[player].Bid
	tricks := ss.Players[player].Tricks
	overtakes := ss.Players[player].Overtakes

	if bid >= OneBidSpades && bid <= EighteenBidSpades {
		if tricks >= int(bid) {
			this_overtakes := tricks - int(bid)
			new_overtakes := (overtakes + this_overtakes) % ss.Config.OvertakeLimit
			overtake_penalty := 0
			if this_overtakes+overtakes >= ss.Config.OvertakeLimit && ss.Config.Overtakes {
				overtake_penalty = ss.Config.OvertakePenalty
			}

			return (int(bid) * ss.Config.TrickMultipler) - overtake_penalty, new_overtakes
		}

		return -1 * int(bid) * ss.Config.TrickMultipler, overtakes
	} else if bid >= NilBidSpades && bid <= TripleNilBidSpades {
		nil_multiplier := 1
		if bid == BlindNilBidSpades {
			nil_multiplier = 2
		} else if bid == TripleNilBidSpades {
			nil_multiplier = 3
		}

		this_overtakes := 0
		if tricks > 0 {
			// If we took anything, we didn't make our nil bid, so negate it.
			nil_multiplier *= -1
			if ss.Config.OvertakesNil {
				this_overtakes = tricks
			}
		}

		new_overtakes := overtakes + this_overtakes
		next_overtakes := new_overtakes % ss.Config.OvertakeLimit
		overtake_penalty := 0
		if new_overtakes >= ss.Config.OvertakeLimit && ss.Config.Overtakes {
			overtake_penalty = ss.Config.OvertakePenalty
		}

		return (nil_multiplier * ss.Config.NilScore) - overtake_penalty, next_overtakes
	}

	log.Println("Error! Unknown bid to score:", bid)

	return 0, 0
}

// Calculates the score with partnerships.
// Returns: score adjustment, total overtakes.
func (ss *SpadesState) scorePartnership(player int, partner int) (int, int) {
	our_bid := ss.Players[player].Bid
	partner_bid := ss.Players[partner].Bid

	// Assumption: if one player bids nil, that player should be us.
	if (our_bid < NilBidSpades || our_bid > TripleNilBidSpades) && (partner_bid >= NilBidSpades && partner_bid <= TripleNilBidSpades) {
		return ss.scorePartnership(partner, player)
	}

	our_tricks := ss.Players[player].Tricks
	partner_tricks := ss.Players[partner].Tricks

	// Assumption: ss.Players[player].Overtakes == ss.Players[partner].Overtakes
	overtakes := ss.Players[player].Overtakes

	if our_bid >= OneBidSpades && our_bid <= EighteenBidSpades {
		// Since we're guaranteed (by above) that nobody bid nil, add and multiply.
		bid := int(our_bid) + int(partner_bid)
		tricks := our_tricks + partner_tricks

		if tricks >= int(bid) {
			this_overtakes := tricks - int(bid)
			new_overtakes := overtakes + this_overtakes
			next_overtakes := new_overtakes % ss.Config.OvertakeLimit
			overtake_penalty := 0
			if new_overtakes >= ss.Config.OvertakeLimit && ss.Config.Overtakes {
				overtake_penalty = ss.Config.OvertakePenalty
			}

			return (int(bid) * ss.Config.TrickMultipler) - overtake_penalty, next_overtakes
		}

		return -1 * int(bid) * ss.Config.TrickMultipler, overtakes
	} else if (our_bid >= NilBidSpades && our_bid <= TripleNilBidSpades) && (partner_bid >= OneBidSpades && partner_bid <= EighteenBidSpades) {
		// Single player bid nil.
		nil_multiplier := 1
		if our_bid == BlindNilBidSpades {
			nil_multiplier = 2
		} else if our_bid == TripleNilBidSpades {
			nil_multiplier = 3
		}

		if our_tricks > 0 {
			nil_multiplier *= -1
		}

		tricks := our_tricks + partner_tricks
		bid := int(partner_bid)

		score_offset := nil_multiplier * ss.Config.NilScore
		new_overtakes := overtakes

		if tricks >= int(bid) {
			// Partner made their bid.
			overtake_penalty := 0
			this_overtakes := tricks - int(bid)

			if ss.Config.OvertakesNil {
				if this_overtakes+overtakes >= ss.Config.OvertakeLimit && ss.Config.Overtakes {
					// Only count joint overtakes if the config requires it.
					new_overtakes = (overtakes + this_overtakes) % ss.Config.OvertakeLimit
					overtake_penalty = ss.Config.OvertakePenalty
				}
			}

			score_offset += (int(bid) * ss.Config.TrickMultipler) - overtake_penalty
		} else {
			// Partner didn't make their bid.
			score_offset -= int(bid) * ss.Config.TrickMultipler
		}

		return score_offset, new_overtakes
	} else if (our_bid >= NilBidSpades && our_bid <= TripleNilBidSpades) && (partner_bid >= NilBidSpades && partner_bid <= TripleNilBidSpades) {
		// Two nils
		our_nil_multiplier := 1
		if our_bid == BlindNilBidSpades {
			our_nil_multiplier = 2
		} else if our_bid == TripleNilBidSpades {
			our_nil_multiplier = 3
		}

		partner_nil_multiplier := 1
		if partner_bid == BlindNilBidSpades {
			partner_nil_multiplier = 2
		} else if partner_bid == TripleNilBidSpades {
			partner_nil_multiplier = 3
		}

		if ss.Config.WithDoubleNil {
			// If both partners made nil, we have a successful double nil.
			if our_tricks != 0 || partner_tricks != 0 {
				our_nil_multiplier *= -1
				partner_nil_multiplier *= -1
			}
		} else {
			// Score individually
			if our_tricks != 0 {
				our_nil_multiplier *= -1
			}

			if partner_tricks != 0 {
				partner_nil_multiplier *= -1
			}
		}

		score_offset := our_nil_multiplier * ss.Config.NilScore
		score_offset += partner_nil_multiplier * ss.Config.NilScore
		return score_offset, overtakes
	}

	log.Println("Error! Unknown partnership bid to score:", our_bid, partner_bid)

	return 0, 0
}
