package utils

import (
	"encoding/base64"
	"fmt"

	crypto_rand "crypto/rand"
	math_rand "math/rand"
)

var idMin uint64 = 1000000000000000
var idMax uint64 = 9999999999999999

var tokenBytes = 512 / 8

func RandomId() uint64 {
	var id = (math_rand.Uint64() % (idMax - idMin)) + idMin
	if !IsValidId(id) {
		panic("RandomId() generated an invalid identifier: " + fmt.Sprintf("%d", id))
	}
	return id
}

func IsValidId(id uint64) bool {
	return id >= idMin && id <= idMax
}

func RandomToken() string {
	var data []byte = make([]byte, tokenBytes)

	_, err := crypto_rand.Read(data)
	if err != nil {
		return ""
	}

	return base64.URLEncoding.EncodeToString(data)
}
