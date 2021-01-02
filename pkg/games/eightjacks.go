package games

import (
	"errors"
	"log"
	"reflect"
	"sort"
	"strconv"
)

const EightJacksGameOver string = "game is over"

func IsOneEyedJack(card Card) bool {
	return card.Rank == JackRank && (card.Suit == HeartsSuit || card.Suit == SpadesSuit)
}

func IsTwoEyedJack(card Card) bool {
	return card.Rank == JackRank && (card.Suit == DiamondsSuit || card.Suit == ClubsSuit)
}

type EightJacksSquare struct {
	ID int `json:"id"`
	X  int `json:"x"`
	Y  int `json:"y"`

	Value  Card `json:"value"`
	Marker int  `json:"marker"`
}

func (ejs *EightJacksSquare) CanPlay(card Card) error {
	if ejs.Value.Rank == JokerRank {
		return errors.New("cannot play on shared wild square")
	}

	if ejs.Marker != -1 && IsOneEyedJack(card) {
		// Playing a one-eyed jack on an occupied square is ok.
		return nil
	}

	if ejs.Marker != -1 && !IsOneEyedJack(card) {
		return errors.New("cannot play on an occupied square")
	}

	if IsTwoEyedJack(card) {
		// Playing a two-eyed Jack on an unoccupied square is ok.
		return nil
	}

	if ejs.Value.Rank != card.Rank || ejs.Value.Suit != card.Suit {
		return errors.New("card doesn't match square")
	}

	return nil
}

type EightJacksBoardMode int

const (
	SquareGridEightJacks       EightJacksBoardMode = iota // 0
	HexGridEightJacks          EightJacksBoardMode = iota // 1
	DoubleSquareGridEightJacks EightJacksBoardMode = iota // 2 -- a tiling pattern using two different sizes of squares.
)

type EightJacksBoard struct {
	Width  int `json:"width"`
	Height int `json:"height"`

	Connectivity EightJacksBoardMode `json:"connectivity"`

	Squares  []*EightJacksSquare               `json:"squares"`
	XYMapped map[int]map[int]*EightJacksSquare `json:"xy_mapped"`
	IDMapped map[int]*EightJacksSquare         `json:"id_mapped"`
}

func (ejb *EightJacksBoard) Init(width int, height int) {
	ejb.Width = width
	ejb.Height = height

	ejb.XYMapped = make(map[int]map[int]*EightJacksSquare)
	for i := 0; i < ejb.Width; i++ {
		ejb.XYMapped[i] = make(map[int]*EightJacksSquare)
	}
	ejb.IDMapped = make(map[int]*EightJacksSquare)
}

type EightJacksPlayer struct {
	Hand     []Card `json:"hand"`
	History  []Card `json:"history"`
	Discards []Card `json:"discards"`

	Team int     `json:"team"`
	Runs [][]int `json:"runs"`
}

func (sp *EightJacksPlayer) Init() {
	sp.Hand = make([]Card, 0)
	sp.History = make([]Card, 0)
	sp.Discards = make([]Card, 0)

	sp.Team = -1
	sp.Runs = make([][]int, 0)
}

func (ejp *EightJacksPlayer) FindCard(cardID int) (int, bool) {
	for index, card := range ejp.Hand {
		if card.ID == cardID {
			return index, true
		}
	}

	return -1, false
}

func (ejp *EightJacksPlayer) RemoveCard(cardID int) bool {
	index, found := ejp.FindCard(cardID)
	if !found {
		return false
	}

	var remaining []Card
	if index > 0 {
		remaining = ejp.Hand[:index]
	}
	remaining = append(remaining, ejp.Hand[index+1:]...)
	ejp.Hand = remaining

	return true
}

type EightJacksConfig struct {
	NumPlayers int `json:"num_players"` // 2 <= n <= 8; best with two to four or six.

	RunLength int `json:"run_length"` // 4 <= n <= 6 -- length of a run for it to count.
	WinLimit  int `json:"win_limit"`  // 1 <= n <= 5 -- number of runs to win.

	BoardWidth   int  `json:"board_width"`   // 8 <= n <= 10
	BoardHeight  int  `json:"board_height"`  // 8 <= n <= 10
	RemoveUnused bool `json:"remove_unused"` // Whether to remove cards not used on the board.
	WildCorners  bool `json:"wild_corners"`  // Whether corners are wild (free for everyone to play on).

	HandSize   int `json:"hand_size"`   // 4 <= n <= 10 -- number of cards in the hand.
	JokerCount int `json:"joker_count"` // 0 <= n <= 8 -- "dual-use jacks".
}

func (cfg EightJacksConfig) Validate() error {
	if cfg.NumPlayers < 2 || cfg.NumPlayers > 8 {
		return GameConfigError{"number of players", strconv.Itoa(cfg.NumPlayers), "between 2 and 8"}
	}

	if cfg.RunLength < 4 || cfg.RunLength > 6 {
		return GameConfigError{"run length", strconv.Itoa(cfg.RunLength), "between 4 and 6"}
	}

	if cfg.WinLimit < 1 || cfg.WinLimit > 5 {
		return GameConfigError{"number of runs to win", strconv.Itoa(cfg.WinLimit), "between 1 and 5"}
	}

	if cfg.BoardWidth < 8 || cfg.BoardWidth > 10 {
		return GameConfigError{"board width", strconv.Itoa(cfg.BoardWidth), "between 8 and 10"}
	}

	if cfg.BoardHeight < 8 || cfg.BoardHeight > 10 {
		return GameConfigError{"board height", strconv.Itoa(cfg.BoardHeight), "between 8 and 10"}
	}

	if cfg.HandSize < 4 || cfg.HandSize > 10 {
		return GameConfigError{"size of hand", strconv.Itoa(cfg.HandSize), "between 4 and 10"}
	}

	if cfg.JokerCount < 0 || cfg.JokerCount > 8 {
		return GameConfigError{"number of jokers", strconv.Itoa(cfg.JokerCount), "between 0 and 8"}
	}

	if cfg.BoardWidth == 10 && cfg.BoardHeight == 10 && !cfg.WildCorners {
		return GameConfigError{"wild corners", strconv.Itoa(cfg.JokerCount), "true if using a 10x10 board"}
	}

	return nil
}

func (cfg *EightJacksConfig) LoadConfig(wire map[string]interface{}) error {
	if wire_value, ok := wire["num_players"]; ok {
		if num_players, ok := wire_value.(float64); ok {
			cfg.NumPlayers = int(num_players)
		} else {
			return errors.New("unable to parse value for num_players as integer: " + reflect.TypeOf(wire_value).String())
		}
	}

	if wire_value, ok := wire["run_length"]; ok {
		if run_length, ok := wire_value.(float64); ok {
			cfg.RunLength = int(run_length)
		} else {
			return errors.New("unable to parse value for run_length as integer: " + reflect.TypeOf(wire_value).String())
		}
	}

	if wire_value, ok := wire["win_limit"]; ok {
		if win_limit, ok := wire_value.(float64); ok {
			cfg.WinLimit = int(win_limit)
		} else {
			return errors.New("unable to parse value for win_limit as integer: " + reflect.TypeOf(wire_value).String())
		}
	}

	if wire_value, ok := wire["board_width"]; ok {
		if board_width, ok := wire_value.(float64); ok {
			cfg.BoardWidth = int(board_width)
		} else {
			return errors.New("unable to parse value for board_width as integer: " + reflect.TypeOf(wire_value).String())
		}
	}

	if wire_value, ok := wire["board_height"]; ok {
		if board_height, ok := wire_value.(float64); ok {
			cfg.BoardHeight = int(board_height)
		} else {
			return errors.New("unable to parse value for board_height as integer: " + reflect.TypeOf(wire_value).String())
		}
	}

	if wire_value, ok := wire["remove_unused"]; ok {
		if remove_unused, ok := wire_value.(bool); ok {
			cfg.RemoveUnused = remove_unused
		} else {
			return errors.New("unable to parse value for removed_unused as boolean: " + reflect.TypeOf(wire_value).String())
		}
	}

	if wire_value, ok := wire["wild_corners"]; ok {
		if wild_corners, ok := wire_value.(bool); ok {
			cfg.WildCorners = wild_corners
		} else {
			return errors.New("unable to parse value for wild_corners as boolean: " + reflect.TypeOf(wire_value).String())
		}
	}

	if wire_value, ok := wire["hand_size"]; ok {
		if hand_size, ok := wire_value.(float64); ok {
			cfg.HandSize = int(hand_size)
		} else {
			return errors.New("unable to parse value for hand_size as integer: " + reflect.TypeOf(wire_value).String())
		}
	}

	if wire_value, ok := wire["joker_count"]; ok {
		if joker_count, ok := wire_value.(float64); ok {
			cfg.JokerCount = int(joker_count)
		} else {
			return errors.New("unable to parse value for joker_count as integer: " + reflect.TypeOf(wire_value).String())
		}
	}

	return nil
}

type EightJacksState struct {
	Turn   int `json:"turn"`
	Dealer int `json:"dealer"`

	Deck    Deck               `json:"deck"`
	Board   EightJacksBoard    `json:"board"`
	Teams   int                `json:"teams"`   // Number of teams
	Players []EightJacksPlayer `json:"players"` // Left of dealer is found by incrementing one.

	Config EightJacksConfig `json:"config"`

	Assigned bool `json:"assigned"`
	Started  bool `json:"started"`
	Dealt    bool `json:"dealt"`
	Finished bool `json:"finished"`
	Winner   int  `json:"winner"`
}

func (ejs *EightJacksState) Init(cfg EightJacksConfig) error {
	var err error = cfg.Validate()
	if err != nil {
		log.Println("Error with EightJacksConfig", err)
		return err
	}

	ejs.Config = cfg
	ejs.Turn = -1
	ejs.Dealer = -1
	ejs.Assigned = false
	ejs.Started = false
	ejs.Dealt = false
	ejs.Finished = false
	ejs.Winner = -1

	return nil
}

func (ejs *EightJacksState) ReInit() error {
	// No-op for now. Nothing needs to be re-initialized after reloading
	// from JSON serialization.
	return nil
}

func (ejs *EightJacksState) Start(players int) error {
	var err error

	if ejs.Started {
		log.Println("Error! Double start occurred...", err)
		return errors.New("double start occurred")
	}

	// Force us to call AssignTeams() next.
	ejs.Assigned = false
	ejs.Started = false
	ejs.Dealt = false
	return nil
}

func (ejs *EightJacksState) AssignTeams(dealer int, num_players int, player_assignments [][]int) error {
	var err error

	if ejs.Started {
		return errors.New("cannot assign teams after already started")
	}

	if ejs.Dealt {
		return errors.New("cannot assign teams after cards are dealt")
	}

	if dealer >= num_players {
		return errors.New("cannot assign dealer higher than number of players")
	}

	// First create players so we can assign them teams.
	ejs.Config.NumPlayers = num_players
	err = ejs.Config.Validate()
	if err != nil {
		log.Println("Err with EightJacksConfig after starting: ", err)
		return err
	}

	// Create all of the players.
	ejs.Players = make([]EightJacksPlayer, ejs.Config.NumPlayers)
	for _, player := range ejs.Players {
		player.Init()
	}

	// Take the assigned mapping and apply it to the players.
	ejs.Assigned = true
	ejs.Teams = len(player_assignments)
	for index, players := range player_assignments {
		for _, player := range players {
			if player < 0 || player >= len(ejs.Players) {
				return errors.New("not a valid player identifier: " + strconv.Itoa(player))
			}

			ejs.Players[player].Team = index
		}
	}

	return nil
}

func (ejs *EightJacksState) StartRound() error {
	if !ejs.Assigned {
		return errors.New("have to call StartRound after assigning players to teams")
	}

	ejs.Started = true

	// Invariants: unless otherwise overridden below, start with dealt = false
	// and bid = false -- this means we still need to deal out the cards before
	// we begin.
	ejs.Dealt = false

	// Create the board prior to shuffling the deck. It uses the Deck as working
	// space in assignments.
	if err := ejs.CreateBoard(); err != nil {
		return err
	}

	// Start with two decks and shuffle them. This will be used to create the board.
	ejs.Deck.Init()
	ejs.Deck.AddStandard52Deck()
	ejs.Deck.AddStandard52Deck()

	if ejs.Config.RemoveUnused {
		// Remove cards that aren't present on the board -- except jacks.
		for _, target := range StandardCardRanks {
			have_card := false
			for _, square := range ejs.Board.Squares {
				if square.Value.Rank == JackRank {
					continue
				}

				if square.Value.Rank == target {
					have_card = true
					break
				}
			}

			if !have_card {
				for _, suit := range StandardCardSuits {
					// Remove twice -- one for each deck.
					ejs.Deck.RemoveCard(target, suit)
					ejs.Deck.RemoveCard(target, suit)
				}
			}
		}
	}

	// Add in Jokers if they were requested.
	for i := 0; i < ejs.Config.JokerCount; i++ {
		ejs.Deck.AddJokers(1, false)
	}

	// Shuffle the deck.
	ejs.Deck.Shuffle()

	starting_player := (ejs.Dealer + 1) % len(ejs.Players)
	for i := 0; i < ejs.Config.HandSize; i++ {
		for player_offset := 0; player_offset < len(ejs.Players); player_offset++ {
			player_index := (starting_player + player_offset) % len(ejs.Players)
			ejs.Players[player_index].Hand = append(ejs.Players[player_index].Hand, *ejs.Deck.Cards[0])
			ejs.Deck.Cards = ejs.Deck.Cards[1:]
		}
	}

	// The first person to play is the one left of the dealer.
	ejs.Turn = (ejs.Dealer + 1) % len(ejs.Players)
	ejs.Dealt = true

	return nil
}

func (ejs *EightJacksState) CreateBoard() error {
	ejs.Board.Init(ejs.Config.BoardWidth, ejs.Config.BoardHeight)

	ejs.Deck.Init()
	ejs.Deck.AddStandard52Deck()
	ejs.Deck.AddStandard52Deck()

	for _, suit := range StandardCardSuits {
		// Remove twice -- one for each deck.
		ejs.Deck.RemoveCard(JackRank, suit)
		ejs.Deck.RemoveCard(JackRank, suit)
	}

	// See HACK note in MarkRun before changing ID assignment scheme.
	id := 1
	for x := 0; x < ejs.Board.Width; x++ {
		for y := 0; y < ejs.Board.Height; y++ {
			var piece EightJacksSquare
			piece.ID = id
			id++

			piece.X = x
			piece.Y = y

			is_corner := x == 0 && y == 0
			is_corner = is_corner || (x == 0 && y == ejs.Board.Height-1)
			is_corner = is_corner || (x == ejs.Board.Width-1 && y == 0)
			is_corner = is_corner || (x == ejs.Board.Width-1 && y == ejs.Board.Height-1)
			if is_corner && ejs.Config.WildCorners {
				piece.Value.ID = 0
				piece.Value.Rank = JokerRank
				piece.Value.Suit = NoneSuit
			} else {
				piece.Value = *ejs.Deck.Cards[0]
				ejs.Deck.Cards = ejs.Deck.Cards[1:]
				piece.Value.ID = 0
			}

			piece.Marker = -1

			ejs.Board.Squares = append(ejs.Board.Squares, &piece)
			ejs.Board.XYMapped[x][y] = &piece
			ejs.Board.IDMapped[piece.ID] = &piece
		}
	}

	return nil
}

func (ejs *EightJacksState) DiscardDuplicate(player int, cardID int) error {
	if !ejs.Started {
		return errors.New("game hasn't started yet")
	}

	if ejs.Finished {
		return errors.New("game has already finished")
	}

	if player < 0 || player >= len(ejs.Players) {
		return errors.New("not a valid player identifier: " + strconv.Itoa(player))
	}

	if ejs.Turn != player {
		return errors.New("not your turn; must discard prior to playing a card")
	}

	if !ejs.Dealt {
		return errors.New("unable to play a card before dealing cards")
	}

	if cardID <= 0 {
		return errors.New("need to specify a card")
	}

	index, found := ejs.Players[player].FindCard(cardID)
	if !found {
		return errors.New("unable to play card not in hand")
	}

	candidate := ejs.Players[player].Hand[index]
	if candidate.Rank == JokerRank {
		return errors.New("you can't discard a joker")
	}

	found_unused := false
	for _, square := range ejs.Board.Squares {
		// Exact matches only!
		if square.Value.Rank == candidate.Rank && square.Value.Suit == candidate.Suit && square.Marker == -1 {
			found_unused = true
			break
		}
	}

	if found_unused {
		return errors.New("unable to discard card while it can still be played")
	}

	// Remove the card from the hand (without saving it in the history -- it
	// wasn't actually played).
	ejs.Players[player].RemoveCard(cardID)
	ejs.Players[player].Discards = append(ejs.Players[player].Discards, candidate)

	// Draw a replacement if possible.
	if len(ejs.Deck.Cards) > 0 {
		ejs.Players[player].Hand = append(ejs.Players[player].Hand, *ejs.Deck.Cards[0])
		ejs.Deck.Cards = ejs.Deck.Cards[1:]
	}

	return nil
}

func (ejs *EightJacksState) PlayCard(player int, cardID int, squareID int) error {
	if !ejs.Started {
		return errors.New("game hasn't started yet")
	}

	if ejs.Finished {
		return errors.New("game has already finished")
	}

	if player < 0 || player >= len(ejs.Players) {
		return errors.New("not a valid player identifier: " + strconv.Itoa(player))
	}

	if ejs.Turn != player {
		return errors.New("not your turn")
	}

	if !ejs.Dealt {
		return errors.New("unable to play a card before dealing cards")
	}

	if cardID <= 0 {
		return errors.New("need to specify a card")
	}

	if squareID <= 0 {
		return errors.New("need to specify a destination")
	}

	index, found := ejs.Players[player].FindCard(cardID)
	if !found {
		return errors.New("unable to play card not in hand")
	}

	played := ejs.Players[player].Hand[index]
	square, found := ejs.Board.IDMapped[squareID]
	if !found {
		return errors.New("unable to find square by that identifier")
	}

	if err := square.CanPlay(played); err != nil {
		return errors.New("unable to play card on specified square: " + err.Error())
	}

	// Mark the square.
	if IsOneEyedJack(played) {
		square.Marker = -1
	} else {
		square.Marker = ejs.Players[player].Team
	}

	// Remove the card from the hand (saving it in the history).
	ejs.Players[player].RemoveCard(cardID)
	ejs.Players[player].History = append(ejs.Players[player].History, played)

	// Draw a replacement if possible.
	if len(ejs.Deck.Cards) > 0 {
		ejs.Players[player].Hand = append(ejs.Players[player].Hand, *ejs.Deck.Cards[0])
		ejs.Deck.Cards = ejs.Deck.Cards[1:]
	}

	ejs.Turn = (ejs.Turn + 1) % len(ejs.Players)

	// Game ends if the next player runs out of cards.
	if len(ejs.Players[ejs.Turn].Hand) == 0 {
		ejs.Finished = true
		return errors.New(EightJacksGameOver)
	}

	return nil
}

func (ejs *EightJacksState) MarkRun(run []int) error {
	if !ejs.Started {
		return errors.New("game hasn't started yet")
	}

	if ejs.Finished {
		return errors.New("game has already finished")
	}

	if !ejs.Dealt {
		return errors.New("unable to play a card before dealing cards")
	}

	if len(run) != ejs.Config.RunLength {
		return errors.New("can only mark runs of size " + strconv.Itoa(ejs.Config.RunLength))
	}

	// XXX: HACK: because we construct identifiers in increasing order, left to
	// right, top to bottom, we can sort the identifiers given in run -- when we
	// iterate, we know that the previous tile always occurs earlier on the board.
	// This lets us check for a valid run by iterating over tiles, checking that
	// the marker lines up, and that it is connected either diagonally (nw/se or
	// ne/sw), up/down, or left/right. If it is valid, we can further validate it
	// against the previous list of runs in players' own assignments.
	sort.Ints(run)

	is_diagonal_se := true
	is_diagonal_sw := true
	is_down := true
	is_right := true

	have_marked := false
	marker := -1

	for index := 1; index < len(run); index++ {
		last_tile_id := run[index-1]
		this_tile_id := run[index]

		last_tile, found := ejs.Board.IDMapped[last_tile_id]
		if !found {
			return errors.New("unable to find last square with specified id")
		}

		this_tile, found := ejs.Board.IDMapped[this_tile_id]
		if !found {
			return errors.New("unable to find this square with specified id")
		}

		if last_tile.Marker != -1 {
			have_marked = true
			if marker == -1 {
				marker = last_tile.Marker
			}
		}

		if this_tile.Marker != -1 {
			have_marked = true
			if marker == -1 {
				marker = this_tile.Marker
			}
		}

		if marker != -1 && this_tile.Marker != -1 && this_tile.Marker != marker {
			return errors.New("run is covered with different colored markers")
		}

		if last_tile.X+1 != this_tile.X || last_tile.Y+1 != this_tile.Y {
			is_diagonal_se = false
		}

		if last_tile.X-1 != this_tile.X || last_tile.Y+1 != this_tile.Y {
			is_diagonal_sw = false
		}

		if last_tile.X != this_tile.X || last_tile.Y+1 != this_tile.Y {
			is_down = false
		}

		if last_tile.X+1 != this_tile.X || last_tile.Y != this_tile.Y {
			is_right = false
		}
	}

	if !have_marked {
		return errors.New("all squares in a run must be played on first or be wild")
	}

	if !is_diagonal_se && !is_diagonal_sw && !is_down && !is_right {
		return errors.New("must have connected squares in the run")
	}

	if is_diagonal_se && is_diagonal_sw && is_down && is_right {
		return errors.New("confusing board -- internal invariant violated")
	}

	// Validate that we don't overlap with more than one square from anyone
	// else's run.
	for _, indexed_player := range ejs.Players {
		for _, indexed_run := range indexed_player.Runs {
			overlap := 0
			for _, indexed_square := range indexed_run {
				for _, our_square := range run {
					if indexed_square == our_square {
						overlap += 1
						if overlap > 1 {
							return errors.New("run is invalid: overlaps with more than one tile of another run")
						}
					}
				}
			}
		}
	}

	finished := false
	for _, indexed_player := range ejs.Players {
		if indexed_player.Team == marker {
			indexed_player.Runs = append(indexed_player.Runs, run)
			if len(indexed_player.Runs) >= ejs.Config.WinLimit {
				finished = true
			}
		}
	}

	if finished {
		ejs.Finished = true
		return errors.New(EightJacksGameOver)
	}

	return nil
}