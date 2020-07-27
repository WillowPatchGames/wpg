package password

import (
	"crypto/rand"
	"errors"
)

var SaltBytes = 256 / 8

var PasswordMismatch = errors.New("Provided password doesn't match hash.")
var InvalidObject = errors.New("Invalid or uninitialized object provided.")
var InvalidSerialization = errors.New("Invalid data provided to Unmarshal.")
var UnknownId = errors.New("Unknown identifier or invalid id provided.")

type Crypt struct {
	Crypter

	Id   string
	Salt []byte
	Hash []byte
}

type Crypter interface {
	Hash(password []byte) error
	Compare(password []byte) error
	Marshal() (string, error)
	Unmarshal(string) error
}

func NewSalt() ([]byte, error) {
	var data []byte = make([]byte, saltBytes)

	_, err := rand.Read(data)
	if err != nil {
		return nil, err
	}

	return data, nil
}

func parseInt(src []byte, index int) (int, int, error) {
	return 0, index, InvalidObject
}
