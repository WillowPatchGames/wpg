package utils

import (
	"bufio"
	"encoding/base64"
	"encoding/binary"
	"fmt"
	"io"
	"log"
	"os"
	"strings"
	"sync"

	crypto_rand "crypto/rand"
	math_rand "math/rand"
)

var idMin uint64 = 1000000000000000
var idMax uint64 = 9999999999999999

var idBytes = 8
var tokenBytes = 512 / 8
var numWords = 4

var wordLock sync.Mutex
var words []string

// ===== Crypto Reader ===== //

type cryptoReader struct {
	math_rand.Source64
}

func (cr cryptoReader) Seed(int64) {}

func (cr *cryptoReader) Int63() int64 {
	return int64(cr.Uint64() >> 2)
}

func (cr *cryptoReader) Uint64() uint64 {
	var data []byte = make([]byte, idBytes)

	_, err := crypto_rand.Read(data)
	if err != nil {
		panic(err)
	}

	return binary.BigEndian.Uint64(data)
}

var cr math_rand.Source64 = &cryptoReader{}

// #nosec G404
var SecureRand *math_rand.Rand = math_rand.New(cr)

// ===== Random Utils ===== //

func RandomId() uint64 {
	var id uint64 = cr.Uint64()
	id = (id % (idMax - idMin)) + idMin

	if !IsValidId(id) {
		panic("RandomId() generated an invalid identifier: " + fmt.Sprintf("%d", id))
	}

	return id
}

func IsValidId(id uint64) bool {
	return id >= idMin && id <= idMax
}

func RandomFloat64() float64 {
	return SecureRand.Float64()
}

func RandomToken() string {
	var data []byte = make([]byte, tokenBytes)

	_, err := crypto_rand.Read(data)
	if err != nil {
		panic(err)
	}

	return base64.URLEncoding.EncodeToString(data)
}

func loadWords() {
	var wordfile = "assets/wordlist.txt"
	file, err := os.Open(wordfile)

	// Assume wordfile was pre-processed
	var fallback = false

	if err != nil {
		wordfile = "/usr/share/dict/words"
		file, err = os.Open(wordfile)
		if err != nil {
			panic(err)
		}
		log.Println("Using fallback dictionary")
		fallback = true
	}

	reader := bufio.NewReader(file)

	line, isPrefix, err := reader.ReadLine()
	for ; err == nil; line, isPrefix, err = reader.ReadLine() {
		if isPrefix {
			continue
		}

		word := strings.ToLower(string(line))
		if !fallback || !strings.ContainsAny(word, "!&',-./0123456789 _`~\"?+") {
			words = append(words, word)
		}
	}

	if err != io.EOF {
		panic(err)
	}
}

func RandomWords() string {
	if len(words) == 0 {
		wordLock.Lock()
		if words == nil {
			loadWords()
		}
		wordLock.Unlock()
	}

	var result []string
	var index uint64 = 0
	var mask uint64 = 1
	var bits uint64 = 1
	for mask < uint64(len(words)) {
		mask = mask << 1
		bits += 1
	}
	mask = mask - 1
	for i := 0; i < numWords; i++ {
		if index < mask {
			index = cr.Uint64()
		}

		var word_index = (index & mask) % uint64(len(words))
		result = append(result, words[word_index])
		index = index >> bits
	}

	return strings.Join(result, "-")
}
