package games

import (
	"strconv"
)

type CardSuit int

const (
	NoneSuit     CardSuit = iota // 0
	ClubsSuit    CardSuit = iota // 1
	HeartsSuit   CardSuit = iota // 2
	SpadesSuit   CardSuit = iota // 3
	DiamondsSuit CardSuit = iota // 4
	FancySuit    CardSuit = iota // 5- A special suit for the high-valued joker
)

var StandardCardSuits = [...]CardSuit{ClubsSuit, HeartsSuit, SpadesSuit, DiamondsSuit}

var CardSuitNames = [...]string{"NoneSuit", "ClubsSuit", "HeartsSuit", "SpadesSuit", "DiamondsSuit", "FancySuit"}

func (s CardSuit) String() string {
	return CardSuitNames[s]
}

type CardRank int

const (
	NoneRank  CardRank = iota // 0
	AceRank   CardRank = iota // 1
	TwoRank   CardRank = iota // 2
	ThreeRank CardRank = iota // 3
	FourRank  CardRank = iota // 4
	FiveRank  CardRank = iota // 5
	SixRank   CardRank = iota // 6
	SevenRank CardRank = iota // 7
	EightRank CardRank = iota // 8
	NineRank  CardRank = iota // 9
	TenRank   CardRank = iota // 10
	JackRank  CardRank = iota // 11
	QueenRank CardRank = iota // 12
	KingRank  CardRank = iota // 13
	JokerRank CardRank = iota // 14
)

var StandardCardRanks = [...]CardRank{AceRank, TwoRank, ThreeRank, FourRank, FiveRank, SixRank, SevenRank, EightRank, NineRank, TenRank, JackRank, QueenRank, KingRank}

var CardRankNames = [...]string{"NoneRank", "AceRank", "TwoRank", "ThreeRank", "FourRank", "FiveRank", "SixRank", "SevenRank", "EightRank", "NineRank", "TenRank", "JackRank", "QueenRank", "KingRank", "JokerRank"}

func (r CardRank) String() string {
	return CardRankNames[r]
}

type Card struct {
	ID   int      `json:"id"`
	Suit CardSuit `json:"suit"`
	Rank CardRank `json:"rank"`
}

func (c Card) Copy() *Card {
	return &Card{
		ID:   c.ID,
		Suit: c.Suit,
		Rank: c.Rank,
	}
}

func (c Card) String() string {
	return "Card{" + strconv.Itoa(c.ID) + ", " + c.Suit.String() + ", " + c.Rank.String() + "}"
}

func FindCard(hand []Card, cardID int) (int, bool) {
	for index, card := range hand {
		if card.ID == cardID {
			return index, true
		}
	}

	return -1, false
}

func RemoveCard(hand []Card, cardID int) (*Card, []Card, bool) {
	index, found := FindCard(hand, cardID)
	if !found {
		return nil, hand, false
	}

	var card = hand[index]
	var remaining []Card
	if index > 0 {
		remaining = hand[:index]
	}
	remaining = append(remaining, hand[index+1:]...)
	return &card, remaining, true
}

type Deck struct {
	Cards []*Card `json:"cards"`
}

func (d *Deck) Init() {
	d.Cards = make([]*Card, 0)
}

func (d *Deck) Draw() *Card {
	if len(d.Cards) == 0 {
		return nil
	}

	card := d.Cards[0]
	d.Cards = d.Cards[1:]
	return card
}
