package games

import (
	"bufio"
	"io"
	"os"
	"strings"
	"sync"

	"github.com/dghubble/trie"
)

var dictionaryLock sync.Mutex
var dictionary *trie.RuneTrie

func loadDictionary() {
	// Because we swap in the dictionary only once it has been fully built, we
	// don't need to lock to check if the dictionary has been loaded already.
	if dictionary != nil {
		return
	}

	dictionaryLock.Lock()
	defer dictionaryLock.Unlock()

	// We might've raced some other thread in checking dictionary != nil, while
	// it still held the lock. This ensures we only build the dictionary when
	// it hasn't been built by another thread, since we now hold the lock.
	if dictionary != nil {
		return
	}

	var dict *trie.RuneTrie = trie.NewRuneTrie()

	// TODO: make configurable
	var wordfile = "/usr/share/dict/words"
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

		word := strings.ToUpper(string(line))
		if !strings.ContainsAny(word, "!&',-./0123456789 _`~\"?+") {
			dict.Put(word, true)
		}
	}

	if err != io.EOF {
		panic(err)
	}

	dictionary = dict
}

func IsWord(word string) bool {
	loadDictionary()

	return dictionary.Get(strings.ToUpper(word)) != nil
}
