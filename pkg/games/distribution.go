package games

var standardFrequencies = map[string]float64{
	"A": 8.04,
	"B": 1.48,
	"C": 3.34,
	"D": 3.82,
	"E": 12.49,
	"F": 2.40,
	"G": 1.87,
	"H": 5.05,
	"I": 7.57,
	"J": 0.16,
	"K": 0.54,
	"L": 4.07,
	"M": 2.51,
	"N": 7.23,
	"O": 7.64,
	"P": 2.14,
	"Q": 0.12,
	"R": 6.28,
	"S": 6.51,
	"T": 9.28,
	"U": 2.73,
	"V": 1.05,
	"W": 1.68,
	"X": 0.23,
	"Y": 1.66,
	"Z": 0.09,
}

var bananagramsFrequencies = map[string]float64{
	"A": 9.03,
	"B": 2.08,
	"C": 2.08,
	"D": 4.17,
	"E": 12.5,
	"F": 2.08,
	"G": 2.78,
	"H": 2.08,
	"I": 8.33,
	"J": 1.39,
	"K": 1.39,
	"L": 3.47,
	"M": 2.08,
	"N": 5.56,
	"O": 7.64,
	"P": 2.08,
	"Q": 1.39,
	"R": 6.25,
	"S": 4.17,
	"T": 4.16,
	"U": 2.08,
	"V": 2.08,
	"W": 2.08,
	"X": 1.39,
	"Y": 2.08,
	"Z": 1.39,
}

var scrabbleFrequencies = map[string]float64{
	"A": 9.00,
	"B": 2.00,
	"C": 2.00,
	"D": 4.00,
	"E": 12.00,
	"F": 3.00,
	"G": 4.00,
	"H": 3.00,
	"I": 9.00,
	"J": 1.00,
	"K": 1.00,
	"L": 4.00,
	"M": 2.00,
	"N": 6.00,
	"O": 8.00,
	"P": 2.00,
	"Q": 1.00,
	"R": 6.00,
	"S": 4.00,
	"T": 6.00,
	"U": 4.00,
	"V": 2.00,
	"W": 2.00,
	"X": 1.00,
	"Y": 2.00,
	"Z": 1.00,
}

func GenerateTiles(count int, wildcards bool) []LetterTile {
	var ret []LetterTile = make([]LetterTile, count)

	for index, tile := range ret {
		tile.ID = index
		tile.Value = "A";
	}

	return ret
}
