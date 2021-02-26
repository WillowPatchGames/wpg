package games

import (
	"errors"
	"log"
	"strconv"

	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/figgy"
)

const HeartsGameOver string = "game is over"
const HeartsNextRound string = "begin next round"

type HeartsPlayer struct {
	Hand []Card `json:"hand"`

	Passed   bool   `json:"passed"`
	Incoming []Card `json:"incoming"`

	Tricks     int `json:"tricks"`
	RoundScore int `json:"round_score"`
	Score      int `json:"score"`
}

func (hp *HeartsPlayer) Init() {
	hp.Hand = make([]Card, 0)
	hp.Incoming = make([]Card, 0)
}

func (hp *HeartsPlayer) FindCard(cardID int) (int, bool) {
	return FindCard(hp.Hand, cardID)
}

func (hp *HeartsPlayer) RemoveCard(cardID int) bool {
	var ret bool
	_, hp.Hand, ret = RemoveCard(hp.Hand, cardID)
	return ret
}

type HeartsConfig struct {
	NumPlayers int `json:"num_players" config:"type:int,min:3,default:4,max:7" label:"Number of players"` // Best with four.

	NumberToPass     int  `json:"number_to_pass" config:"type:int,min:1,default:3,max:8" label:"Number of cards to pass"`                                                                                  // Number of cards to pass.
	HoldRound        bool `json:"hold_round" config:"type:bool,default:true" label:"true:Pass left, right, then hold (non-four players only),false:Only pass left and then right (non-four players only)"` // Whether to add a holding round when playing with non-four players.
	MustBreakHearts  bool `json:"must_break_hearts" config:"type:bool,default:true" label:"true:Hearts must be broken before being lead,false:Can lead Hearts at any time"`                                // Whether hearts need to be broken before they can be lead.
	BlackWidowBreaks bool `json:"black_widow_breaks" config:"type:bool,default:false" label:"true:Black Widow (Queen of Spades) breaks Hearts,false:Black Widow (Queen of Spades) doesn't break Hearts"`   // Whether Queen of Spades breaks hearts.
	FirstTrickHearts bool `json:"first_trick_hearts" config:"type:bool,default:false" label:"true:Can sluff points on the first trick,false:Can't play points on the first trick"`                         // Whether Hearts are allowed on the first trick.
	WithCrib         bool `json:"with_crib" config:"type:bool,default:false" label:"true:Put extra cards in a crib (taken with the first trick),false:Remove extra cards to deal evenly"`                  // Whether to remove cards or add a crib.

	// Scoring
	WinAmount         int  `json:"win_amount" config:"type:int,min:50,default:100,max:500,step:5" label:"Ending amount"`
	ShootMoonReduces  bool `json:"shoot_moon_reduces" config:"type:bool,default:false" label:"true:Shooting the Moon reduces your score,false:Shooting the Moon raises everyone elses' scores"`            // Whether shooting the moon reduces your score, or adds to everyone else.
	ShootTheSun       bool `json:"shoot_the_sun" config:"type:bool,default:true" label:"true:Score double for Shooting the Sun (taking all the tricks),false:No bonus for taking all tricks"`              // Whether to score shooting the sun.
	JackOfDiamonds    bool `json:"jack_of_dimaonds" config:"type:bool,default:false" label:"true:Taking the Jack of Diamonds reduces your score by 11,false:No bonus for taking the Jack of Diamonds"`     // Whether taking the Jack of Diamonds in a trick reduces your score by 11.
	TenOfClubs        bool `json:"ten_of_clubs" config:"type:bool,default:false" label:"true:Taking the Ten of Clubs doubles your score for the round,false:No penalty for taking the Ten of Clubs"`       // Whether taking the Ten of Clubs doubles your score for the round.
	BlackWidowForFive bool `json:"black_widow_for_five" config:"type:bool,default:false" label:"true:Black Widow (Queen of Spades) counts as 5,false:Black Widow (Queen of Spades) counts as 13"`          // Whether the Queen of Spades counts as 5 instead of 13.
	AceOfHearts       bool `json:"ace_of_hearts" config:"type:bool,default:false" label:"true:Ace of Hearts counts as 5,false:Ace of Hearts counts as 1"`                                                  // Whether taking the Ace of Hearts counts as 5 points.
	NoTrickBonus      bool `json:"no_trick_bonus" config:"type:bool,default:false" label:"true:Taking no tricks reduces your score by 5,false:No bonus for taking no tricks"`                              // Whether taking no tricks grants a -5 point bonus.
	HundredToHalf     bool `json:"hundred_to_half" config:"type:bool,default:false" label:"true:Exactly hitting the ending amount halves your score,false:No prize for hitting the ending amount exactly"` // Whether hitting exactly WinAmount points reduces your score to half.

	// Common game configuration options
	Countdown bool `json:"countdown" config:"type:bool,default:true" label:"true:Show a 3... 2... 1... countdown before beginning,false:Start the game instantly"` // Whether to wait and send countdown messages.
}

func (cfg HeartsConfig) Validate() error {
	return nil
}

type HeartsTrick struct {
	Leader int    `json:"leader"`
	Played []Card `json:"played"`
	Winner int    `json:"winner"`
}

type HeartsRoundPlayer struct {
	DealtHand  []Card `json:"dealt_hand"`
	PlayedHand []Card `json:"played_hand"`

	Tricks     int `json:"tricks"`
	RoundScore int `json:"round_score"`
	Score      int `json:"score"`

	PassedTo   int    `json:"passed_to"`
	PassedFrom int    `json:"passed_from"`
	Passed     []Card `json:"passed"`     // Cards the player passed to someone else.
	GotPassed  []Card `json:"got_passed"` // Cards someone passed to us.
}

type HeartsRound struct {
	Dealer        int                 `json:"dealer"`
	Deck          []*Card             `json:"deck"`
	Crib          []Card              `json:"crib"`
	Players       []HeartsRoundPlayer `json:"players"`
	Tricks        []HeartsTrick       `json:"tricks"`
	PassDirection HeartsPassDirection `json:"pass_direction"`
}

type HeartsPassDirection int

const (
	LeftPassDirectionHearts   = iota // 0
	RightPassDirectionHearts  = iota // 1
	AcrossPassDirectionHearts = iota // 2
	HoldPassDirectionHearts   = iota // 3
)

type HeartsState struct {
	Turn   int `json:"turn"`
	Leader int `json:"leader"`
	Dealer int `json:"dealer"`

	Deck          Deck                `json:"deck"`
	Players       []HeartsPlayer      `json:"players"`        // Left of dealer is found by incrementing one.
	PassDirection HeartsPassDirection `json:"pass_direction"` // Direction to pass cards.
	Crib          []Card              `json:"crib,omitempty"` // Contents of the crib (left over during dealing)

	Played       []Card `json:"played"`        // Currently played cards in this round.
	HeartsBroken bool   `json:"hearts_broken"` // Whether or not hearts have been broken.

	PreviousTricks [][]Card       `json:"previous_tricks"` // Contents of previous tricks in the current round; sent to clients.
	RoundHistory   []*HeartsRound `json:"round_history"`   // Contents of previous rounds for analysis.

	Config HeartsConfig `json:"config"`

	Started  bool `json:"started"`
	Dealt    bool `json:"dealt"`
	Passed   bool `json:"passed"`
	Finished bool `json:"finished"`
	Winner   int  `json:"winner"`
}

func (hs *HeartsState) Init(cfg HeartsConfig) error {
	var err error = figgy.Validate(cfg)
	if err != nil {
		log.Println("Error with HeartsConfig", err)
		return err
	}

	hs.Config = cfg
	hs.Turn = -1
	hs.Dealer = -1
	hs.Started = false
	hs.Finished = false
	hs.Winner = -1

	return nil
}

func (hs *HeartsState) GetConfiguration() figgy.Figgurable {
	return hs.Config
}

func (hs *HeartsState) ReInit() error {
	// No-op for now. Nothing needs to be re-initialized after reloading
	// from JSON serialization.
	return nil
}

func (hs *HeartsState) IsStarted() bool {
	return hs.Started
}

func (hs *HeartsState) IsFinished() bool {
	return hs.Finished
}

func (hs *HeartsState) ResetStatus() {
	hs.Started = false
	hs.Finished = false
}

func (hs *HeartsState) Start(players int) error {
	var err error

	if hs.Started {
		log.Println("Error! Double start occurred...", err)
		return errors.New("double start occurred")
	}

	hs.Config.NumPlayers = players
	err = figgy.Validate(hs.Config)
	if err != nil {
		log.Println("Err with HeartsConfig after starting: ", err)
		return err
	}

	// Create all of the players.
	hs.Players = make([]HeartsPlayer, hs.Config.NumPlayers)
	for _, player := range hs.Players {
		player.Init()
	}

	// Force us to call StartRound() next.
	hs.Dealt = false
	hs.Passed = false
	hs.Dealer = 0
	hs.PassDirection = HoldPassDirectionHearts

	// Start the round: shuffle the cards and (if necessary) deal them out.
	err = hs.StartRound()
	if err != nil {
		log.Println("Error starting round: ", err)
		return err
	}

	hs.Started = true
	return nil
}

func (hs *HeartsState) StartRound() error {
	if hs.Dealt {
		return errors.New("unable to call StartRound while we've already dealt")
	}

	// Invariants: unless otherwise overridden below, start with dealt = false
	// and passed = false -- this means we still need to deal out the cards before
	// we begin.
	hs.Dealt = false
	hs.Passed = false
	hs.HeartsBroken = false

	// Start building history of moves.
	hs.RoundHistory = append(hs.RoundHistory, &HeartsRound{})
	history := hs.RoundHistory[len(hs.RoundHistory)-1]
	history.Dealer = hs.Dealer
	history.Players = make([]HeartsRoundPlayer, len(hs.Players))
	history.Tricks = make([]HeartsTrick, 0)

	// Start with a clean deck and shuffle it.
	hs.Deck.Init()
	hs.Deck.AddStandard52Deck()

	have_two_clubs := true

	if !hs.Config.WithCrib {
		if hs.Config.NumPlayers == 3 || hs.Config.NumPlayers == 7 {
			// Remove 1 card
			found := hs.Deck.RemoveCard(TwoRank, DiamondsSuit)
			if !found {
				log.Println("Error! Expected two of diamonds in standard deck, but wasn't found")
				return errors.New("bad deck of cards; no two of diamonds to remove")
			}
		} else if hs.Config.NumPlayers == 5 {
			// Remove 2 cards
			found := hs.Deck.RemoveCard(TwoRank, DiamondsSuit)
			if !found {
				log.Println("Error! Expected two of diamonds in standard deck, but wasn't found")
				return errors.New("bad deck of cards; no two of diamonds to remove")
			}

			found = hs.Deck.RemoveCard(TwoRank, SpadesSuit)
			if !found {
				log.Println("Error! Expected two of spades in standard deck, but wasn't found")
				return errors.New("bad deck of cards; no two of diamonds to remove")
			}
		} else if hs.Config.NumPlayers == 6 {
			// Remove 4 cards
			have_two_clubs = false

			found := hs.Deck.RemoveCard(TwoRank, DiamondsSuit)
			if !found {
				log.Println("Error! Expected two of diamonds in standard deck, but wasn't found")
				return errors.New("bad deck of cards; no two of diamonds to remove")
			}

			found = hs.Deck.RemoveCard(TwoRank, SpadesSuit)
			if !found {
				log.Println("Error! Expected two of spades in standard deck, but wasn't found")
				return errors.New("bad deck of cards; no two of diamonds to remove")
			}

			found = hs.Deck.RemoveCard(TwoRank, ClubsSuit)
			if !found {
				log.Println("Error! Expected two of clubs in standard deck, but wasn't found")
				return errors.New("bad deck of cards; no two of diamonds to remove")
			}

			found = hs.Deck.RemoveCard(ThreeRank, DiamondsSuit)
			if !found {
				log.Println("Error! Expected two of diamonds in standard deck, but wasn't found")
				return errors.New("bad deck of cards; no two of diamonds to remove")
			}
		}
	}

	// Shuffling the deck before assigning cards to players.
	hs.Deck.Shuffle()

	// Save the initial deck.
	history.Deck = CopyDeck(hs.Deck.Cards)

	// Clear out all round-specific status before each round.
	for index := range hs.Players {
		hs.Players[index].Hand = make([]Card, 0)
		hs.Players[index].Incoming = make([]Card, 0)
		hs.Players[index].Passed = false
	}
	hs.Crib = make([]Card, 0)

	// Deal out all cards. Start with the player left of the dealer.
	starting_player := (hs.Dealer + 1) % len(hs.Players)
	leading_player := -1
	for len(hs.Deck.Cards) >= len(hs.Players) {
		for player_offset := 0; player_offset < len(hs.Players); player_offset++ {
			player_index := (starting_player + player_offset) % len(hs.Players)
			this_card := *hs.Deck.Draw()
			hs.Players[player_index].Hand = append(hs.Players[player_index].Hand, this_card)

			if leading_player == -1 {
				if have_two_clubs && this_card.Rank == TwoRank && this_card.Suit == ClubsSuit {
					leading_player = player_index
				} else if !have_two_clubs && this_card.Rank == ThreeRank && this_card.Suit == ClubsSuit {
					leading_player = player_index
				}
			}
		}
	}

	if leading_player == -1 {
		if !hs.Config.WithCrib {
			log.Println("Error! Bad Dealing: Unable to find two of clubs / three of clubs!")
			return errors.New("bad dealing: unable to find leading card (two or three of clubs)")
		}

		// With the crib, we might end up with two of clubs in the crib. This isn't
		// condusive to our game, so stick it in someone's hand, replacing the next
		// highest club NOT in the crib (e.g., 4 of clubs if both 2 and 3 are in
		// the crib). This makes the hand effectively equivalent to what they
		// already had.
		var two_clubs_index = -1
		var next_highest Card
		next_highest.Rank = ThreeRank
		next_highest.Suit = ClubsSuit

		for index, card := range hs.Deck.Cards {
			if card.Suit == ClubsSuit {
				if card.Rank == TwoRank {
					two_clubs_index = index
					break
				}

				if card.Rank == next_highest.Rank {
					next_highest.Rank = CardRank(int(next_highest.Rank) + 1)
				}
			}
		}

		if two_clubs_index == -1 {
			return errors.New("bad dealing: expected two of clubs in crib but couldn't find it")
		}

		for index := range hs.Players {
			var found int = -1
			for hand_index, card := range hs.Players[index].Hand {
				if card.Rank == next_highest.Rank && card.Suit == next_highest.Suit {
					found = hand_index
					break
				}
			}

			if found != -1 {
				var replacement Card = hs.Players[index].Hand[found]
				hs.Players[index].Hand[found] = *hs.Deck.Cards[two_clubs_index]
				hs.Deck.Cards[two_clubs_index] = &replacement
				break
			}
		}
	}

	if len(hs.Deck.Cards) > 0 {
		if !hs.Config.WithCrib {
			log.Println("Error! Bad Dealing: Expected even number of cards!")
			return errors.New("bad dealing: remaining cards left in deck but WithCrib not enabled")
		}

		for _, card := range hs.Deck.Cards {
			hs.Crib = append(hs.Crib, *card)
			history.Crib = append(history.Crib, *card)
		}

		hs.Deck.Cards = make([]*Card, 0)
	}

	// Increment the passing mechanism.
	hs.PassDirection = HeartsPassDirection((int(hs.PassDirection) + 1) % 4)

	if hs.PassDirection == AcrossPassDirectionHearts && hs.Config.NumPlayers != 4 {
		if hs.Config.HoldRound {
			hs.PassDirection = HoldPassDirectionHearts
		} else {
			hs.PassDirection = LeftPassDirectionHearts
		}
	}

	// The first person to bid and play is the one with the leading card (either
	// two or three of clubs). Note that this doesn't matter if we have to
	// exchange cards first.
	history.PassDirection = hs.PassDirection
	if hs.PassDirection == HoldPassDirectionHearts {
		hs.Turn = leading_player
		hs.Leader = leading_player
		hs.Passed = true
	} else {
		hs.Turn = hs.Dealer
		hs.Leader = hs.Dealer
		hs.Passed = false
	}

	// Copy everyone's dealt hands.
	for index, indexed_player := range hs.Players {
		history.Players[index].DealtHand = CopyHand(indexed_player.Hand)
	}

	hs.Dealt = true

	return nil
}

func (hs *HeartsState) PassCards(player int, cards []int) error {
	if !hs.Started {
		return errors.New("game hasn't started yet")
	}

	if hs.Finished {
		return errors.New("game has already finished")
	}

	if player < 0 || player >= len(hs.Players) {
		return errors.New("not a valid player identifier: " + strconv.Itoa(player))
	}

	if !hs.Dealt {
		return errors.New("unable to play a card before dealing cards")
	}

	if hs.Passed {
		return errors.New("unable to play after passing")
	}

	if len(cards) != hs.Config.NumberToPass {
		return errors.New("need to pass " + strconv.Itoa(hs.Config.NumberToPass) + " cards")
	}

	for _, cardID := range cards {
		if cardID == 0 {
			return errors.New("need to specify card to pass")
		}

		_, found := hs.Players[player].FindCard(cardID)
		if !found {
			return errors.New("unable to pass card not in your hand")
		}
	}

	var new_player int
	if hs.PassDirection == LeftPassDirectionHearts {
		new_player = (player + 1) % len(hs.Players)
	} else if hs.PassDirection == RightPassDirectionHearts {
		new_player = (player + len(hs.Players) - 1) % len(hs.Players)
	} else if hs.PassDirection == AcrossPassDirectionHearts {
		new_player = (player + (len(hs.Players))/2) % len(hs.Players)
	} else {
		return errors.New("shouldn't be passing cards while holding")
	}

	// Move cards to their new owner, but don't put them in the hand right
	// away. This allows us to hid them from the owner until everyone has
	// passed cards.
	history := hs.RoundHistory[len(hs.RoundHistory)-1]
	for _, cardID := range cards {
		hand_index, _ := hs.Players[player].FindCard(cardID)
		card := hs.Players[player].Hand[hand_index]
		hs.Players[new_player].Incoming = append(hs.Players[new_player].Incoming, card)
		history.Players[player].Passed = append(history.Players[player].Passed, card)
		history.Players[new_player].GotPassed = append(history.Players[new_player].GotPassed, card)
		hs.Players[player].RemoveCard(cardID)
	}
	hs.Players[player].Passed = true
	history.Players[player].PassedTo = new_player
	history.Players[new_player].PassedFrom = player

	all_passed := true
	for _, indexed_player := range hs.Players {
		if !indexed_player.Passed {
			all_passed = false
		}
	}

	if all_passed {
		hs.Passed = true

		// First put the passed cards into the hand...
		for player_index, indexed_player := range hs.Players {
			hs.Players[player_index].Hand = append(hs.Players[player_index].Hand, indexed_player.Incoming...)
		}

		// Then copy off their hands again...
		for index, indexed_player := range hs.Players {
			history.Players[index].PlayedHand = CopyHand(indexed_player.Hand)
		}

		// Now we've gotta find the Two of Clubs so we know who the round
		// leader is...
		// ...and oh by the way, sometimes it is the Three of Clubs. \o/

		target := Card{0, ClubsSuit, TwoRank}
		if hs.Config.NumPlayers == 6 && !hs.Config.WithCrib {
			target.Rank = ThreeRank
		}

		leading_player := -1
		for player_index, indexed_player := range hs.Players {
			for _, card := range indexed_player.Hand {
				if card.Rank == target.Rank && card.Suit == target.Suit {
					leading_player = player_index
					break
				}
			}
		}

		if leading_player == -1 {
			return errors.New("invalid configuration and dealing: unable to find leading card in anyone's hand after passing")
		}

		hs.Turn = leading_player
		hs.Leader = leading_player
	}

	return nil
}

func (hs *HeartsState) PlayCard(player int, card int) error {
	if !hs.Started {
		return errors.New("game hasn't started yet")
	}

	if hs.Finished {
		return errors.New("game has already finished")
	}

	if player < 0 || player >= len(hs.Players) {
		return errors.New("not a valid player identifier: " + strconv.Itoa(player))
	}

	if hs.Turn != player {
		return errors.New("not your turn")
	}

	if !hs.Dealt {
		return errors.New("unable to play a card before dealing cards")
	}

	if !hs.Passed {
		return errors.New("unable to play before passing")
	}

	if card <= 0 {
		return errors.New("need to specify a card")
	}

	index, found := hs.Players[player].FindCard(card)
	if !found {
		return errors.New("unable to play card not in hand")
	}

	var this_trick *HeartsTrick = nil
	played := hs.Players[player].Hand[index]
	history := hs.RoundHistory[len(hs.RoundHistory)-1]
	first_trick := false

	// Validate we can play this card first.
	if hs.Turn == hs.Leader {
		// Create our new trick in the history.
		trick_index := len(history.Tricks)
		first_trick = trick_index == 0 || (trick_index == 1 && len(history.Tricks[0].Played) == 0)

		// If this is the very first round, check whether or not we chose the
		// right card. It will either be the Two or Three of Clubs.
		if first_trick {
			if hs.Config.NumPlayers == 6 && !hs.Config.WithCrib {
				if played.Rank != ThreeRank || played.Suit != ClubsSuit {
					return errors.New("must lead the three of clubs on the first trick")
				}
			} else {
				if played.Rank != TwoRank || played.Suit != ClubsSuit {
					return errors.New("must lead the two of clubs on the first trick")
				}
			}
		}

		// If we're the leader, ensure either hearts have been broken or this is
		// our only suit.
		if played.Suit == HeartsSuit && !hs.HeartsBroken && hs.Config.MustBreakHearts {
			for _, card := range hs.Players[player].Hand {
				if card.Suit != HeartsSuit && card.Rank != JokerRank {
					// Have a non-Heart, non-Joker card we could've played instead.
					return errors.New("must sluff hearts before hearts can be lead")
				}
			}
			hs.HeartsBroken = true
		}

		// Create our trick only after we're allowed to play this card.
		history.Tricks = append(history.Tricks, HeartsTrick{})
		this_trick = &history.Tricks[trick_index]
		this_trick.Leader = hs.Leader

		// Also clear out everyone's incoming cards -- they should've seen them
		// all by now.
		for player_index := range hs.Players {
			hs.Players[player_index].Incoming = make([]Card, 0)
		}
	} else {
		// Got an existing trick
		this_trick = &history.Tricks[len(history.Tricks)-1]

		// Otherwise, ensure we follow the lead suit if we can.
		lead_suit := hs.Played[0].Suit

		if lead_suit != played.Suit {
			for _, card := range hs.Players[player].Hand {
				if card.Suit == lead_suit {
					// Have a different card we could've played instead.
					return errors.New("must follow the lead suit")
				}
			}
		}

		if len(hs.RoundHistory[len(hs.RoundHistory)-1].Tricks) == 1 {
			if !hs.Config.FirstTrickHearts {
				if played.Suit == HeartsSuit {
					return errors.New("can't play hearts on the first trick")
				}

				if played.Suit == SpadesSuit && played.Rank == QueenRank {
					return errors.New("can't play the Queen of Spades on the first trick")
				}
			}
		}

		if !hs.HeartsBroken && played.Suit == HeartsSuit {
			// We've got a sluffer!
			hs.HeartsBroken = true
		}
	}

	hs.Players[player].RemoveCard(card)
	if hs.Turn == hs.Leader {
		hs.Played = make([]Card, 0)

		// If this is the very first trick, also reset the number of tricks taken
		// by everyone. This lets people see it _after_ the first round ends, but
		// _before_ the first card is played in the next round.
		if first_trick {
			for player_index := 0; player_index < len(hs.Players); player_index++ {
				hs.Players[player_index].Tricks = 0
			}
		}
	}
	hs.Played = append(hs.Played, played)
	this_trick.Played = append(this_trick.Played, played)

	if played.Suit == SpadesSuit && played.Rank == QueenRank && hs.Config.BlackWidowBreaks {
		hs.HeartsBroken = true
	}

	hs.Turn = (hs.Turn + 1) % hs.Config.NumPlayers
	if hs.Turn == hs.Leader {
		// Got back to the player who started this trick. Determine a winner and
		// exit.
		return hs.determineTrickWinner()
	}

	return nil
}

func (hs *HeartsState) determineTrickWinner() error {
	var winner_offset = 0
	var winning_card = hs.Played[0]

	history := hs.RoundHistory[len(hs.RoundHistory)-1]
	this_trick := &history.Tricks[len(history.Tricks)-1]

	// Always have at least three players, so an offset of one is always valid.
	for offset := 1; offset < hs.Config.NumPlayers; offset++ {
		this_card := hs.Played[offset]
		if winning_card.Suit == this_card.Suit {
			// Highest card of the lead suit wins, always.
			is_higher := this_card.Rank > winning_card.Rank && winning_card.Rank != AceRank
			is_ace_win := this_card.Rank == AceRank
			if is_higher || is_ace_win {
				winner_offset = offset
				winning_card = this_card
			}
		}
	}

	absolute_winner := (hs.Leader + winner_offset) % hs.Config.NumPlayers
	hs.Leader = absolute_winner
	hs.Turn = absolute_winner
	hs.PreviousTricks = append(hs.PreviousTricks, hs.Played)
	hs.Players[absolute_winner].Tricks += 1
	this_trick.Winner = absolute_winner

	if len(hs.Players[0].Hand) == 0 {
		// Can't play again in this round. Tabulate the round score and maybe try
		// to play another round.
		return hs.tabulateRoundScore()
	}

	return nil
}

func (hs *HeartsState) tabulateRoundScore() error {
	history := hs.RoundHistory[len(hs.RoundHistory)-1]

	// Update everyone's scores first. But before we do that, we need to reset
	// everyone's RoundScore to 0. This lets us correctly handle shooting the
	// moon/sun. Apply HundredToHalf last, after everyones' scores have been
	// taken into account.
	for player := 0; player < hs.Config.NumPlayers; player++ {
		hs.Players[player].RoundScore = 0
	}
	for player := 0; player < hs.Config.NumPlayers; player++ {
		hs.scoreSingle(player)
	}
	if hs.Config.HundredToHalf {
		for player := 0; player < hs.Config.NumPlayers; player++ {
			if hs.Players[player].Score == hs.Config.WinAmount {
				// Leave the round score as it is, so people know why it was halved.
				hs.Players[player].Score = hs.Config.WinAmount / 2
			}
		}
	}

	// Save stuff in history while we're at it.
	for player := 0; player < hs.Config.NumPlayers; player++ {
		history.Players[player].Tricks = hs.Players[player].Tricks
		history.Players[player].RoundScore = hs.Players[player].RoundScore
		history.Players[player].Score = hs.Players[player].Score
	}

	var winner_offset = 0
	var winner_score = hs.Players[0].Score
	var max_score = hs.Players[0].Score
	for player := 1; player < hs.Config.NumPlayers; player++ {
		if hs.Players[player].Score >= max_score {
			max_score = hs.Players[player].Score
		}

		if hs.Players[player].Score < winner_score {
			winner_score = hs.Players[player].Score
			winner_offset = player
		}
	}

	// If we have a winner, exit the game.
	if max_score > hs.Config.WinAmount {
		hs.Finished = true
		hs.Dealt = true
		hs.Passed = true
		hs.Winner = winner_offset
		hs.Turn = -1
		hs.Dealer = -1
		return errors.New(HeartsGameOver)
	}

	// Otherwise, increment the dealer.
	hs.Dealt = false
	hs.Dealer = (hs.Dealer + 1) % hs.Config.NumPlayers

	return errors.New(HeartsNextRound)
}

// Calculate the score for a single player with no partnerships.
// Returns: score adjustment, total overtakes.
func (hs *HeartsState) scoreSingle(player int) {
	history := hs.RoundHistory[len(hs.RoundHistory)-1]

	num_hearts := 0
	have_ace_hearts := false
	have_queen_spades := false
	have_jack_diamonds := false
	have_ten_clubs := false
	shot_moon := true
	shot_sun := true
	took_trick := false

	for index, trick := range history.Tricks {
		if trick.Winner != player {
			log.Println("[hearts scoring] Scoring player " + strconv.Itoa(player) + " -- found trick taken by " + strconv.Itoa(trick.Winner) + " -- not shot sun")
			shot_sun = false

			// Check if we shot the moon: if someone else took a trick with hearts
			// or the Queen of Spades, we didn't.
			if shot_moon {
				for _, card := range trick.Played {
					if card.Suit == HeartsSuit {
						log.Println("[hearts scoring] Scoring player " + strconv.Itoa(player) + " -- found hearts in trick taken by " + strconv.Itoa(trick.Winner) + " -- not shot moon")
						shot_moon = false
						break
					}

					if card.Rank == QueenRank && card.Suit == SpadesSuit {
						log.Println("[hearts scoring] Scoring player " + strconv.Itoa(player) + " -- found queen of spades in trick taken by " + strconv.Itoa(trick.Winner) + " -- not shot moon")
						shot_moon = false
						break
					}
				}
			}

			if index == 0 && len(history.Crib) > 0 {
				for _, card := range history.Crib {
					if card.Suit == HeartsSuit {
						log.Println("[hearts scoring] Scoring player " + strconv.Itoa(player) + " -- found hearts in crib taken by " + strconv.Itoa(trick.Winner) + " -- not shot moon")
						shot_moon = false
						break
					}

					if card.Rank == QueenRank && card.Suit == SpadesSuit {
						log.Println("[hearts scoring] Scoring player " + strconv.Itoa(player) + " -- found queen of spades in crib taken by " + strconv.Itoa(trick.Winner) + " -- not shot moon")
						shot_moon = false
						break
					}
				}
			}

			continue
		}

		took_trick = true

		for _, card := range trick.Played {
			if card.Suit == HeartsSuit {
				num_hearts += 1
			}

			if card.Rank == AceRank && card.Suit == HeartsSuit {
				have_ace_hearts = true
			}

			if card.Rank == QueenRank && card.Suit == SpadesSuit {
				have_queen_spades = true
			}

			if card.Rank == JackRank && card.Suit == DiamondsSuit {
				have_jack_diamonds = true
			}

			if card.Rank == TenRank && card.Suit == ClubsSuit {
				have_ten_clubs = true
			}
		}

		if index == 0 && len(history.Crib) > 0 {
			for _, card := range history.Crib {
				if card.Suit == HeartsSuit {
					num_hearts += 1
				}

				if card.Rank == AceRank && card.Suit == HeartsSuit {
					have_ace_hearts = true
				}

				if card.Rank == QueenRank && card.Suit == SpadesSuit {
					have_queen_spades = true
				}

				if card.Rank == JackRank && card.Suit == DiamondsSuit {
					have_jack_diamonds = true
				}

				if card.Rank == TenRank && card.Suit == ClubsSuit {
					have_ten_clubs = true
				}
			}
		}
	}

	if shot_moon || shot_sun {
		hand_value := num_hearts + 5
		if have_queen_spades && !hs.Config.BlackWidowForFive {
			// Counts as 13, but we scored it as 5. Add in the difference.
			hand_value += (13 - 5)
		}

		if have_ace_hearts && hs.Config.AceOfHearts {
			// Counts as 5, but we scored it as 1. Add in the difference.
			hand_value += (5 - 1)
		}

		if have_jack_diamonds && hs.Config.JackOfDiamonds {
			hand_value += 11
		}

		if shot_sun {
			hand_value *= 2
		} else if have_ten_clubs && hs.Config.TenOfClubs {
			hand_value /= 2
		}

		if hs.Config.ShootMoonReduces {
			hs.Players[player].RoundScore += -1 * hand_value
			hs.Players[player].Score += -1 * hand_value
		} else {
			for i := 0; i < len(hs.Players); i++ {
				if i == player {
					continue
				}

				hs.Players[i].RoundScore += hand_value
				hs.Players[i].Score += hand_value
			}
		}

		return
	}

	hand_value := num_hearts

	if have_queen_spades {
		if hs.Config.BlackWidowForFive {
			hand_value += 5
		} else {
			hand_value += 13
		}
	}

	if have_ace_hearts && hs.Config.AceOfHearts {
		// Counts as 5, but we scored it as 1. Add in the difference.
		hand_value += (5 - 1)
	}

	if have_jack_diamonds && hs.Config.JackOfDiamonds {
		hand_value += -11
	}

	if have_ten_clubs && hs.Config.TenOfClubs {
		hand_value *= 2
	}

	if !took_trick && hs.Config.NoTrickBonus {
		hand_value = -5
	}

	hs.Players[player].RoundScore += hand_value
	hs.Players[player].Score += hand_value
}
