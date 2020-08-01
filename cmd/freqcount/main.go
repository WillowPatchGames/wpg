package main

import (
	"bufio"
	"flag"
	"fmt"
	"io"
	"os"
	"strings"
	re "regexp"
)

// This program attempts to reverse engineer useful frequencies for letters
// for playing word games. In particular, we assume we're making a tree-like
// structure, and count the letters in any valid tree.

var words []string

var frequencies []uint64 = make([]uint64, 26)
var totals uint64

var pattern *re.Regexp = re.MustCompile("^[a-z]{2,}$")

func loadWords(wordfile string) {
	file, err := os.Open(wordfile)
	if err != nil {
		panic(err)
	}

	reader := bufio.NewReader(file)

	line, isPrefix, err := reader.ReadLine()
	for ; err == nil; line, isPrefix, err = reader.ReadLine() {
		if isPrefix {
			continue
		}

		word := strings.ToLower(string(line))
		// word = word[0:len(word) - 1]
		if pattern.MatchString(word) {
			words = append(words, word)
		}
	}

	if err != io.EOF {
		panic(err)
	}
}

func countLetters(times uint64, words ...string) {
	for _, word := range words {
		for _, letter := range word {
			frequencies[letter-'a'] += times
		}
	}
}

func specialCaseTwo() {
	// Two is a special case: any two words form a trivial intersection if they
	// have at least one letter in common. Each letter in common becomes a
	// different way of arranging the words to form a valid grid.
	for index, a_word := range words {
		if (index % 1000) == 0 {
			printStats()
			fmt.Println(".")
		}

		var a_counts []uint64 = make([]uint64, 26)
		for _, a_letter := range a_word {
			a_counts[a_letter-'a'] += 1
		}

		for _, b_word := range words[index+1:] {
			var b_counts []uint64 = make([]uint64, 26)
			for _, b_letter := range b_word {
				b_counts[b_letter-'a'] += 1
			}

			var times uint64 = 0
			for index, a_count := range a_counts {
				times += a_count * b_counts[index]
			}

			if times == 0 {
				continue
			}

			for index, a_count := range a_counts {
				frequencies[index] += a_count * times
				frequencies[index] += b_counts[index] * times
			}

			totals += times
		}
	}
}

func printStats() {
	var stats []float64 = make([]float64, len(frequencies))
	var sum_letters uint64 = 0
	var output map[byte]float64 = make(map[byte]float64, 26)
	for _, count := range frequencies {
		sum_letters += count
	}
	for index, count := range frequencies {
		stats[index] = float64(count) / float64(sum_letters)
	}
	for index, value := range stats {
		output['a'+byte(index)] = value * 100
	}
	fmt.Println(output)
}

func main() {
	var max_depth int
	flag.IntVar(&max_depth, "max_depth", 5, "Maximum word depth to search")

	var wordlist string
	flag.StringVar(&wordlist, "wordlist", "/usr/share/dict/words", "Path to wordlist")

	flag.Parse()

	loadWords(wordlist)
	fmt.Println("Loaded:", len(words), "words")



	// Special case: two
	specialCaseTwo()

	printStats()

	/*
		for depth := 3; depth <= max_depth; depth++ {
			var indices = make([]int, depth)

		}*/
}
