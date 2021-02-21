package games

import (
	"errors"
	"log"
	"strconv"

	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/figgy"
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
	Hand     []Card  `json:"hand"`
	DrawPile []*Card `json:"draw_pile"`

	Drawn  *Card     `json:"drawn"`
	Peeked bool      `json:"peeked"`
	Bid    SpadesBid `json:"bid"`
	Tricks int       `json:"tricks"`

	Team      int `json:"team"`
	Score     int `json:"score"`
	Overtakes int `json:"overtakes"`
}

func (sp *SpadesPlayer) Init() {
	sp.Hand = make([]Card, 0)
	sp.Drawn = nil
}

func (sp *SpadesPlayer) FindCard(cardID int) (int, bool) {
	return FindCard(sp.Hand, cardID)
}

func (sp *SpadesPlayer) RemoveCard(cardID int) bool {
	var ret bool
	_, sp.Hand, ret = RemoveCard(sp.Hand, cardID)
	return ret
}

type SpadesConfig struct {
	NumPlayers      int  `json:"num_players" config:"type:int,min:2,default:4,max:6" label:"Number of players"`                                                                                    // Best with four.
	Overtakes       bool `json:"overtakes" config:"type:bool,default:true" label:"true:Overtakes counted,false:No overtakes"`                                                                      // No overtakes at all.
	OvertakeLimit   int  `json:"overtake_limit" config:"type:int,min:2,default:10,max:20" label:"Overtake penalty limit"`                                                                          // Number of overtakes before a penalty.
	MustBreakSpades bool `json:"must_break_spades" config:"type:bool,default:true" label:"true:Must wait for spades to be sluffed before leading spades,false:Can play spades at any time"`        // Whether spades need to be broken before they can be lead.
	AddJokers       bool `json:"add_jokers" config:"type:bool,default:false" label:"true:Add Jokers for three or six players,false:Leave Jokers out"`                                              // For three or six players: add jokers to round off the number of cards. Otherwise, one card will be left in the deck with three players, or the twos will be removed with six.
	FirstWins       bool `json:"first_wins" config:"type:bool,default:true" label:"true:First highest played card wins (six players only),false:Last highest played card wins (six players only)"` // For six players: whether the first or the last card played wins in case of a tie in value.

	// Nil
	WithNil        bool `json:"with_nil" config:"type:bool,default:true" label:"true:Allow nil bids,false:Forbid nid and zero bids"`                                                                     // Allow nil bids.
	OvertakesNil   bool `json:"overtakes_nil" config:"type:bool,default:false" label:"true:Score overtakes with nil,false:Ignore overtakes with nil bids"`                                               // Overtakes count when you or your partner bids nil.
	BlindBidding   bool `json:"blind_bidding" config:"type:bool,default:true" label:"true:Enable blind bidding,false:Always peek at cards before bidding"`                                               // Allow "blind" bidding.
	WithDoubleNil  bool `json:"with_double_nil" config:"type:bool,default:true" label:"true:Require both partners make nil if both bid nil (double nil),false:Score partners bidding nil separately"`    // When true and both players bid nil, both must make it.
	WithBreakBonus bool `json:"with_break_bonus" config:"type:bool,default:false" label:"true:Give a bonus for breaking both partners in double nil,false:No bonus for breaking both partners nil bids"` // Breaking both double nil players grants a bonus to the breakers.

	// Scoring
	WinAmount       int  `json:"win_amount" config:"type:int,min:50,default:500,max:1000" label:"Winning point threshhold"`
	OvertakePenalty int  `json:"overtake_penalty" config:"type:enum,default:100,options:50:50 Points;100:100 Points;150:150 Points;200:200 Points" label:"Overtake penalty"`                                         // n in {50, 100, 150, 200}.
	TrickMultiplier int  `json:"trick_multiplier" config:"type:enum,default:10,options:5:5x;10:10x" label:"Trick multiplier"`                                                                                        // n in {5, 10}.
	MoonOrBoston    bool `json:"perfect_round" config:"type:bool,default:false" label:"true:Score half of winning amount for a perfect round (Moon or Boston),false:Score no additional points for a perfect round"` // Score half of the win amount for a perfect round (taking all tricks tricks).
	NilScore        int  `json:"nil_score" config:"type:enum,default:100,options:50:50 Points;75:75 Points;100:100 Points;125:125 Points;150:150 Points;200:200 Points" label:"Single nil score"`                    // n in {50, 75. 100, 125, 150, 200}.
}

func (cfg SpadesConfig) Validate() error {
	/*if !cfg.BlindBidding && cfg.WithTripleNil {
		return GameConfigError{"triple nil", "true", "false when blind bidding is false"}
	}*/

	return nil
}

type SpadesTrick struct {
	Leader int    `json:"leader"`
	Played []Card `json:"played"`
	Winner int    `json:"winner"`
}

type SpadesRoundPlayer struct {
	Hand     []Card  `json:"hand"`
	DrawPile []*Card `json:"draw_pile"`

	Bid    SpadesBid `json:"bid"`
	Tricks int       `json:"tricks"`

	Team       int `json:"team"`
	RoundScore int `json:"round_score"`
	Score      int `json:"score"`
	Overtakes  int `json:"overtakes"`
}

type SpadesRound struct {
	Dealer int     `json:"dealer"`
	Deck   []*Card `json:"deck"`

	Players []SpadesRoundPlayer `json:"players"`
	Tricks  []SpadesTrick       `json:"tricks"`
}

type SpadesState struct {
	Turn   int `json:"turn"`
	Leader int `json:"leader"`
	Dealer int `json:"dealer"`

	Deck           Deck           `json:"deck"`
	Teams          int            `json:"teams"`
	Players        []SpadesPlayer `json:"players"`         // Left of dealer is found by incrementing one.
	Played         []Card         `json:"played"`          // Currently played cards in this round.
	SpadesBroken   bool           `json:"spades_broken"`   // Whether or not spades have been broken.
	PreviousTricks [][]Card       `json:"previous_tricks"` // Contents of previous tricks in the current round; sent to clients.
	RoundHistory   []*SpadesRound `json:"round_history"`   // Contents of previous rounds for analysis.

	Config SpadesConfig `json:"config"`

	Assigned bool `json:"assigned"`
	Started  bool `json:"started"`
	Dealt    bool `json:"dealt"`
	Split    bool `json:"split"`
	Bid      bool `json:"bid"`

	Finished bool  `json:"finished"`
	Winners  []int `json:"winners"`
}

func (ss *SpadesState) Init(cfg SpadesConfig) error {
	var err error = figgy.Validate(cfg)
	if err != nil {
		log.Println("Error with SpadesConfig", err)
		return err
	}

	ss.Config = cfg
	ss.Turn = -1
	ss.Dealer = -1
	ss.Assigned = false
	ss.Started = false
	ss.Finished = false
	ss.Winners = make([]int, 0)

	ss.PreviousTricks = make([][]Card, 0)

	return nil
}

func (ss *SpadesState) GetConfiguration() figgy.Figgurable {
	return ss.Config
}

func (ss *SpadesState) ReInit() error {
	// No-op for now. Nothing needs to be re-initialized after reloading
	// from JSON serialization.
	return nil
}

func (ss *SpadesState) IsStarted() bool {
	return ss.Started
}

func (ss *SpadesState) IsFinished() bool {
	return ss.Finished
}

func (ss *SpadesState) ResetStatus() {
	ss.Started = false
	ss.Finished = false
}

func (ss *SpadesState) Start() error {
	var err error

	if !ss.Assigned {
		return errors.New("must assign players prior to starting")
	}

	if ss.Started {
		log.Println("Error! Double start occurred...", err)
		return errors.New("double start occurred")
	}

	err = figgy.Validate(ss.Config)
	if err != nil {
		log.Println("Err with SpadesConfig after starting: ", err)
		return err
	}

	// Force us to call StartRound() next.
	ss.Dealt = false
	ss.Split = false
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

func (ss *SpadesState) AssignTeams(dealer int, num_players int, player_assignments [][]int) error {
	var err error

	if ss.Started {
		return errors.New("cannot assign teams after already started")
	}

	if ss.Dealt {
		return errors.New("cannot assign teams after cards are dealt")
	}

	if dealer < 0 || dealer >= num_players {
		return errors.New("cannot assign dealer out of bounds of number of players")
	}

	// First create players so we can assign them teams.
	ss.Config.NumPlayers = num_players
	err = figgy.Validate(ss.Config)
	if err != nil {
		log.Println("Error with SpadesConfig after starting: ", err)
		return err
	}

	// Create all of the players
	ss.Players = make([]SpadesPlayer, ss.Config.NumPlayers)
	for index := range ss.Players {
		ss.Players[index].Init()
	}

	// Take the assigned mapping and apply it to the players.
	ss.Assigned = true
	ss.Teams = len(player_assignments)
	for index, players := range player_assignments {
		if len(players) < 0 {
			return errors.New("unable to have an empty team: " + strconv.Itoa(index) + " has no players")
		}

		if len(players) > 2 {
			// As Spades is currently coded, we only allow up to two
			// people on a team. We can't handle more without changing
			// the definition of double nil &c.
			return errors.New("unable to have more than two players on a team: team " + strconv.Itoa(index) + " has " + strconv.Itoa(len(players)) + " players")
		}

		for _, player := range players {
			if player < 0 || player >= len(ss.Players) {
				return errors.New("not a valid player identifier: " + strconv.Itoa(player))
			}

			ss.Players[player].Team = index
		}
	}

	return nil
}

func (ss *SpadesState) StartRound() error {
	if !ss.Assigned {
		return errors.New("must assign players prior to starting")
	}

	if ss.Dealt {
		return errors.New("unable to call StartRound while existing round in progress")
	}

	// Invariants: unless otherwise overridden below, start with dealt = false
	// and bid = false -- this means we still need to deal out the cards before
	// we begin.
	ss.Dealt = false
	ss.Split = false
	ss.Bid = false
	ss.SpadesBroken = false

	ss.RoundHistory = append(ss.RoundHistory, &SpadesRound{})
	history := ss.RoundHistory[len(ss.RoundHistory)-1]
	history.Dealer = ss.Dealer
	history.Players = make([]SpadesRoundPlayer, len(ss.Players))
	history.Tricks = make([]SpadesTrick, 0)

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
				log.Println("Error! Expected one of the two of clubs in standard deck, but wasn't found")
				return errors.New("bad deck of cards; no two of clubs to remove")
			}

			found = ss.Deck.RemoveCard(TwoRank, ClubsSuit)
			if !found {
				log.Println("Error! Expected two of the two of clubs in standard deck, but wasn't found")
				return errors.New("bad deck of cards; no two of clubs to remove")
			}
		} else {
			ss.Deck.AddJokers(4, false)
		}
	}

	// Shuffling the deck before assigning cards to players.
	ss.Deck.Shuffle()

	// Save the initial deck.
	history.Deck = make([]*Card, len(ss.Deck.Cards))
	copy(history.Deck, ss.Deck.Cards)

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
		// cards with player involvement; set Dealt to true (to indicate we've
		// split into two piles).
		ss.Turn = ss.Dealer

		// The first trick will be led by the other player
		ss.Leader = (ss.Dealer + 1) % 2

		// Here, we facilitate the act of drawing. Notice the pattern: peek
		// at the top card, and either take that card (discarding the next),
		// or discard and take the next. This means each player looks at the
		// same cards, regardless of what the other did -- always two at a time.
		// While we could just let each player draw from the top of the deck,
		// until they reach their limit, we're doing this correctly and instead
		// splitting it in two up front, according to what they would've drawn.
		//
		// Note: like the note above, we start this with the dealer, NOT with
		// the player left of the dealer.
		for len(ss.Deck.Cards) >= 2*len(ss.Players) {
			for player_offset := 0; player_offset < len(ss.Players); player_offset++ {
				if len(ss.Deck.Cards) < 2 {
					return errors.New("invariant failure: fewer than two left in deck while creating draw piles")
				}

				player_index := (ss.Dealer + player_offset) % len(ss.Players)
				ss.Players[player_index].DrawPile = append(ss.Players[player_index].DrawPile, ss.Deck.Cards[:2]...)
				ss.Deck.Cards = ss.Deck.Cards[2:]
			}
		}

		// Save the initial draw pile and team assignments.
		for player_index := 0; player_index < len(ss.Players); player_index++ {
			history.Players[player_index].Team = ss.Players[player_index].Team
			history.Players[player_index].DrawPile = make([]*Card, len(ss.Players[player_index].DrawPile))
			copy(history.Players[player_index].DrawPile, ss.Players[player_index].DrawPile)
		}

		ss.Dealt = true

		return nil
	}

	// Deal out all cards. Start with the player left of the dealer.
	starting_player := (ss.Dealer + 1) % len(ss.Players)
	for len(ss.Deck.Cards) >= len(ss.Players) {
		for player_offset := 0; player_offset < len(ss.Players); player_offset++ {
			player_index := (starting_player + player_offset) % len(ss.Players)
			ss.Players[player_index].Hand = append(ss.Players[player_index].Hand, *ss.Deck.Draw())
		}
	}

	// The first person to bid and play is the one left of the dealer.
	ss.Turn = starting_player
	ss.Leader = ss.Turn
	ss.Dealt = true
	ss.Split = true

	// Copy everyone's dealt hands.
	for index, indexed_player := range ss.Players {
		history.Players[index].Hand = make([]Card, len(indexed_player.Hand))
		copy(history.Players[index].Hand, indexed_player.Hand)
	}

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

	if !ss.Dealt {
		return errors.New("not able to peek before dealing")
	}

	if ss.Split {
		return errors.New("not able to peek after splitting")
	}

	if ss.Config.NumPlayers != 2 {
		log.Println("Error! DrawTop called when more than two players:", ss.Config.NumPlayers)
		return errors.New("invalid call: more than two players")
	}

	if ss.Players[player].Drawn != nil {
		return errors.New("already have picked up a card; decide whether to keep or discard it")
	}

	if len(ss.Players[player].DrawPile) == 0 {
		return errors.New("already picked up all cards; wait for other play to finish")
	}

	ss.Players[player].Drawn = ss.Players[player].DrawPile[0]
	ss.Players[player].DrawPile = ss.Players[player].DrawPile[1:]

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

	if !ss.Dealt {
		return errors.New("unable to DecideTop before dealing")
	}

	if ss.Split {
		return errors.New("unable to DecideTop after splitting")
	}

	if player < 0 || player >= len(ss.Players) {
		return errors.New("not a valid player identifier: " + strconv.Itoa(player))
	}

	if ss.Config.NumPlayers != 2 {
		log.Println("Error! DrawTop called when more than two players:", ss.Config.NumPlayers)
		return errors.New("invalid call: more than two players")
	}

	if len(ss.Players[player].DrawPile) == 0 {
		ss.Dealt = false
		ss.Split = false
		return errors.New("invalid state: no more cards to draw")
	}

	if ss.Players[player].Drawn == nil {
		return errors.New("need to pick up a card first")
	}

	if keep {
		// Keep the card we peeked at and discard the rest.
		ss.Players[player].Hand = append(ss.Players[player].Hand, *ss.Players[player].Drawn)
	} else {
		ss.Players[player].Hand = append(ss.Players[player].Hand, *ss.Players[player].DrawPile[0])
	}
	ss.Players[player].DrawPile = ss.Players[player].DrawPile[1:]

	ss.Players[player].Drawn = nil

	all_split := true
	for player_index := 0; player_index < len(ss.Players); player_index++ {
		if len(ss.Players[player_index].DrawPile) >= 2 || ss.Players[player_index].Drawn != nil {
			ss.Turn = player_index
			all_split = false
			break
		}
	}

	if all_split {
		ss.Split = true

		// Oddly, with two player spades, the dealer starts by taking a card, but
		// the other player bids first. Correct the offset if all the cards have
		// been dealt.
		ss.Turn = (ss.Dealer + 1) % ss.Config.NumPlayers

		// Copy everyone's picked hands.
		history := ss.RoundHistory[len(ss.RoundHistory)-1]
		for index, indexed_player := range ss.Players {
			history.Players[index].Hand = make([]Card, len(indexed_player.Hand))
			copy(history.Players[index].Hand, indexed_player.Hand)
		}
	} else {
		if len(ss.Players[player].DrawPile) >= 2 {
			return ss.PeekTop(player)
		}
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
		return errors.New("unable to place bid before dealing cards")
	}

	if !ss.Split {
		return errors.New("unable to place bid before spliting cards")
	}

	if ss.Bid {
		return errors.New("already bid; can't bid again")
	}

	if bid == NotBidSpades {
		return errors.New("can't skip bidding")
	}

	if bid <= NotBidSpades || bid >= OutOfBoundsBidSpades {
		return errors.New("invalid bid value for spades")
	}

	if bid == NilBidSpades && !ss.Config.WithNil {
		return errors.New("can't bid nil when not enabled by config")
	}

	if bid == BlindNilBidSpades && (!ss.Config.WithDoubleNil || !ss.Config.BlindBidding) {
		return errors.New("can't bid blind nil when not enabled by config")
	}

	/*if bid == TripleNilBidSpades && (!ss.Config.WithTripleNil || !ss.Config.BlindBidding) {
		return errors.New("can't bid triple nil when not enabled by config")
	}*/

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

	history := ss.RoundHistory[len(ss.RoundHistory)-1]

	// Record the bid.
	ss.Players[player].Bid = bid
	history.Players[player].Bid = bid

	// Also, allow players to look at their cards now.
	ss.Players[player].Peeked = true

	// By this point, two-player spades has synced back up with the remaining
	// variants so we can safely go from dealer -> left of dealer.

	// Dealer bids last.
	if ss.Turn == ss.Dealer {
		ss.Bid = true
	}

	ss.Turn = (ss.Turn + 1) % ss.Config.NumPlayers
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

	if !ss.Split {
		return errors.New("unable to play a card before spliting cards")
	}

	if !ss.Bid {
		return errors.New("unable to play before bidding")
	}

	if card <= 0 {
		return errors.New("need to specify a card")
	}

	index, found := ss.Players[player].FindCard(card)
	if !found {
		return errors.New("unable to play card not in hand")
	}

	var this_trick *SpadesTrick = nil
	played := ss.Players[player].Hand[index]
	history := ss.RoundHistory[len(ss.RoundHistory)-1]
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

		// Create our trick only after we're allowed to play this card.
		trick_index := len(history.Tricks)
		history.Tricks = append(history.Tricks, SpadesTrick{})
		this_trick = &history.Tricks[trick_index]
		this_trick.Leader = ss.Leader
	} else {
		// Got an existing trick
		this_trick = &history.Tricks[len(history.Tricks)-1]

		// Otherwise, ensure we follow the lead suit if we can.
		lead_suit := ss.Played[0].Suit
		lead_effectively_spade := lead_suit == SpadesSuit || ss.Played[0].Rank == JokerRank
		if lead_effectively_spade {
			lead_suit = SpadesSuit
		}

		if (lead_effectively_spade && !effectively_spade) || (!lead_effectively_spade && !effectively_spade && lead_suit != played.Suit) || (!lead_effectively_spade && effectively_spade) {
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

	ss.Players[player].RemoveCard(card)
	if ss.Turn == ss.Leader {
		ss.Played = make([]Card, 0)
	}
	ss.Played = append(ss.Played, played)
	this_trick.Played = append(this_trick.Played, played)

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

	history := ss.RoundHistory[len(ss.RoundHistory)-1]
	this_trick := &history.Tricks[len(history.Tricks)-1]

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
	this_trick.Winner = absolute_winner

	if len(ss.Players[0].Hand) == 0 {
		// Can't play again in this round. Tabulate the round score and maybe try
		// to play another round.
		return ss.tabulateRoundScore()
	}

	return nil
}

func (ss *SpadesState) tabulateRoundScore() error {
	history := ss.RoundHistory[len(ss.RoundHistory)-1]

	// Update everyone's scores first.
	for player := 0; player < len(ss.Players); player++ {
		// Find a partner if one exists.
		var partner = player
		var have_partner = false
		for partner = 0; partner < len(ss.Players); partner++ {
			if partner == player {
				continue
			}

			if ss.Players[player].Team == ss.Players[partner].Team {
				have_partner = true
				break
			}
		}

		if have_partner && partner <= player {
			break
		}

		if !have_partner {
			// Everyone for themselves!
			score, overtakes := ss.scoreSingle(player)
			ss.Players[player].Score += score
			ss.Players[player].Overtakes = overtakes

			// Update the history
			history.Players[player].Tricks = ss.Players[player].Tricks
			history.Players[player].RoundScore = score
			history.Players[player].Score = ss.Players[player].Score
			history.Players[player].Overtakes = ss.Players[player].Overtakes
		} else {
			score, overtakes := ss.scorePartnership(player, partner)
			ss.Players[player].Score += score
			ss.Players[player].Overtakes = overtakes
			ss.Players[partner].Score += score
			ss.Players[partner].Overtakes = overtakes

			// Update the history for both
			history.Players[player].Tricks = ss.Players[player].Tricks
			history.Players[player].RoundScore = score
			history.Players[player].Score = ss.Players[player].Score
			history.Players[player].Overtakes = ss.Players[player].Overtakes
			history.Players[partner].Tricks = ss.Players[partner].Tricks
			history.Players[partner].RoundScore = score
			history.Players[partner].Score = ss.Players[partner].Score
			history.Players[partner].Overtakes = ss.Players[partner].Overtakes
		}
	}

	var winner_offsets = make([]int, 0)
	var winner_score = -1
	var winning_team = -1
	for player := 0; player < len(ss.Players); player++ {
		if ss.Players[player].Score >= ss.Config.WinAmount {
			if ss.Players[player].Score > winner_score {
				winner_score = ss.Players[player].Score
				winner_offsets = append(winner_offsets, player)
				winning_team = ss.Players[player].Team
			} else if ss.Players[player].Score == winner_score {
				// If we have two teams who are tied for the winning score,
				// we need to play another round until they break apart.
				if winning_team != ss.Players[player].Team {
					winning_team = -1
				}
			}
		}
	}

	// If we have only a single winner, exit the game.
	if len(winner_offsets) > 0 && winning_team != -1 {
		ss.Finished = true
		ss.Dealt = true
		ss.Bid = true
		ss.Turn = -1
		ss.Dealer = -1
		ss.Winners = winner_offsets
		return errors.New(SpadesGameOver)
	}

	ss.Dealt = false
	ss.Dealer = (ss.Dealer + 1) % ss.Config.NumPlayers

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

			return (int(bid) * ss.Config.TrickMultiplier) - overtake_penalty, new_overtakes
		}

		return -1 * int(bid) * ss.Config.TrickMultiplier, overtakes
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

			return (int(bid) * ss.Config.TrickMultiplier) - overtake_penalty, next_overtakes
		}

		return -1 * int(bid) * ss.Config.TrickMultiplier, overtakes
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

			score_offset += (int(bid) * ss.Config.TrickMultiplier) - overtake_penalty
		} else {
			// Partner didn't make their bid.
			score_offset -= int(bid) * ss.Config.TrickMultiplier
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
