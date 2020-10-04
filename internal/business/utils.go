package business

import (
	"strings"
	"time"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
)

type planConfig struct {
	CacheExpiry time.Duration       `yaml:"cache_expiry"`
	Plans       []database.Plan     `yaml:"plans"`
	Assignments map[string][]string `yaml:"assignments"`
}

func Matcher(available string, given string) bool {
	var parts []string = strings.Split(available, ",")
	for _, part := range parts {
		if part == "*" {
			return true
		}

		if part[0] == '*' && part[len(part)-1] == '*' {
			contains := part[1 : len(part)-1]
			if strings.Contains(given, contains) {
				return true
			}
		} else if part[0] == '*' {
			suffix := part[1:]
			if strings.HasSuffix(given, suffix) {
				return true
			}
		} else if part[len(part)-1] == '*' {
			prefix := part[:len(part)-1]
			if strings.HasPrefix(given, prefix) {
				return true
			}
		}

		if part == given {
			return true
		}
	}

	return false
}
