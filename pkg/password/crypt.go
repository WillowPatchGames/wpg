package password

import (
	"crypto/rand"
	"errors"
)

var SaltBytes = 256 / 8

var ErrPasswordMismatch = errors.New("provided password doesn't match hash")
var ErrInvalidObject = errors.New("invalid or uninitialized object provided")
var ErrInvalidSerialization = errors.New("invalid data provided to Unmarshal")
var ErrUnknownId = errors.New("unknown identifier or invalid id provided")

type Crypt struct {
	Crypter

	Id    string
	Salt  []byte
	Value []byte
}

type Crypter interface {
	Hash(password []byte) error
	Compare(password []byte) error
	Marshal() (string, error)
	Unmarshal(string) error
}

func NewSalt() ([]byte, error) {
	var data []byte = make([]byte, SaltBytes)

	_, err := rand.Read(data)
	if err != nil {
		return nil, err
	}

	return data, nil
}

func parseInt(src []byte, index int) (int, int, error) {
	return 0, index, ErrInvalidObject
}
