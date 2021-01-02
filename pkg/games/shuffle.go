package games

import (
	"git.cipherboy.com/WillowPatchGames/wpg/internal/utils"
)

func (d *Deck) AddStandard52Deck() {
	for _, suit := range StandardCardSuits {
		for _, rank := range StandardCardRanks {
			var card Card = Card{0, suit, rank}
			d.Cards = append(d.Cards, &card)
		}
	}
}

func (d *Deck) AddJokers(count int, marked bool) {
	for i := 0; i < count; i++ {
		var suit CardSuit = NoneSuit
		if marked {
			suit = FancySuit
		}

		var card Card = Card{0, suit, JokerRank}
		d.Cards = append(d.Cards, &card)
	}
}

func (d *Deck) RemoveCard(rank CardRank, suit CardSuit) bool {
	var remaining []*Card = nil
	var remainder_index = -1
	var found = false

	for index, card := range d.Cards {
		if card.Rank == rank && card.Suit == suit {
			remaining = d.Cards[:index]
			remainder_index = index + 1
			found = true
			break
		}
	}

	if remainder_index != -1 && remainder_index < len(d.Cards) {
		remaining = append(remaining, d.Cards[remainder_index:]...)
	}

	if remaining != nil {
		d.Cards = remaining
	}

	return found
}

func (d *Deck) Shuffle() {
	// By shuffling, then assigning IDs, and then shuffling IDs, we get random
	// identifier -> card assignments, and random order of IDs in a deck.
	missing_ids := d.Cards[0].ID == 0

	if missing_ids {
		utils.SecureRand.Shuffle(len(d.Cards), func(i, j int) {
			d.Cards[i], d.Cards[j] = d.Cards[j], d.Cards[i]
		})

		for index, card := range d.Cards {
			card.ID = index + 1
		}
	}

	utils.SecureRand.Shuffle(len(d.Cards), func(i, j int) {
		d.Cards[i], d.Cards[j] = d.Cards[j], d.Cards[i]
	})
}
