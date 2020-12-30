package games

type CardSuit int

const (
	NoneSuit     CardSuit = iota
	ClubsSuit    CardSuit = iota
	HeartsSuit   CardSuit = iota
	SpadesSuit   CardSuit = iota
	DiamondsSuit CardSuit = iota
	FancySuit    CardSuit = iota // A special suit for the high-valued joker
)

var StandardCardSuits = [...]CardSuit{ClubsSuit, HeartsSuit, SpadesSuit, DiamondsSuit}

type CardRank int

const (
	NoneRank  CardRank = iota
	AceRank   CardRank = iota
	TwoRank   CardRank = iota
	ThreeRank CardRank = iota
	FourRank  CardRank = iota
	FiveRank  CardRank = iota
	SixRank   CardRank = iota
	SevenRank CardRank = iota
	EightRank CardRank = iota
	NineRank  CardRank = iota
	TenRank   CardRank = iota
	JackRank  CardRank = iota
	QueenRank CardRank = iota
	KingRank  CardRank = iota
	JokerRank CardRank = iota
)

var StandardCardRanks = [...]CardRank{AceRank, TwoRank, ThreeRank, FourRank, FiveRank, SixRank, SevenRank, EightRank, NineRank, TenRank, JackRank, QueenRank, KingRank}

type Card struct {
	ID   int      `json:"id"`
	Suit CardSuit `json:"suit"`
	Rank CardRank `json:"rank"`
}

type Deck struct {
	Cards []Card `json:"cards"`
}

func (d *Deck) Init() {
	d.Cards = make([]Card, 0)
}
