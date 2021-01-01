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
	return "{id:" + strconv.Itoa(c.ID) + " suit:" + strconv.Itoa(int(c.Suit)) + " rank:" + strconv.Itoa(int(c.Rank)) + " }"
}

type Deck struct {
	Cards []*Card `json:"cards"`
}

func (d *Deck) Init() {
	d.Cards = make([]*Card, 0)
}
