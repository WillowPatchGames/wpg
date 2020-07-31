package utils

import (
	"encoding/base64"
	"encoding/binary"
	"fmt"

	crypto_rand "crypto/rand"
	math_rand "math/rand"
)

var idMin uint64 = 1000000000000000
var idMax uint64 = 9999999999999999

var idBytes = 8
var tokenBytes = 512 / 8

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
var c *math_rand.Rand = math_rand.New(cr)

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
	return c.Float64()
}

func RandomToken() string {
	var data []byte = make([]byte, tokenBytes)

	_, err := crypto_rand.Read(data)
	if err != nil {
		panic(err)
	}

	return base64.URLEncoding.EncodeToString(data)
}
