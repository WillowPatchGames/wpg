package utils

import (
	// #nosec G501
	"crypto/md5"
	"encoding/hex"
	"strings"
)

func GravatarHash(email string) string {
	trimmed := strings.TrimSpace(email)
	lowercased := strings.ToLower(trimmed)

	// #nosec G401
	hashed := md5.Sum([]byte(lowercased))
	return hex.EncodeToString(hashed[:])
}
