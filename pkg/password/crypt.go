package password

import (
	"crypto/rand"
	"errors"
)

var ErrPasswordMismatch = errors.New("provided password doesn't match hash")
var ErrInvalidObject = errors.New("invalid or uninitialized object provided")
var ErrInvalidSerialization = errors.New("invalid data provided to Unmarshal")

type Crypt struct {
	Crypter

	ID    string
	Salt  []byte
	Value []byte
}

type Crypter interface {
	Hash(password []byte) error
	Compare(password []byte) error
	Marshal() ([]byte, error)
	Unmarshal([]byte) error
}

func NewSalt(length int) ([]byte, error) {
	var data []byte = make([]byte, length)

	_, err := rand.Read(data)
	if err != nil {
		return nil, err
	}

	return data, nil
}

func isDigit(src []byte, index int) bool {
	return ('0' <= src[index]) && (src[index] <= '9')
}

func isBase64Digit(src []byte, index int) bool {
	var digit = isDigit(src, index)
	var lower = ('a' <= src[index]) && (src[index] <= 'z')
	var upper = ('A' <= src[index]) && (src[index] <= 'Z')
	var symbol = (src[index] == '-') || (src[index] == '_')
	var padding = (src[index] == '=')

	return digit || lower || upper || symbol || padding
}

func parseInt(src []byte, index int) (int, int, error) {
	var ret int = 0
	var negative bool = false

	if len(src) <= index {
		return ret, index, ErrInvalidObject
	}

	if src[index] == '-' {
		negative = true
		index++

		if len(src) <= index {
			return ret, index, ErrInvalidObject
		}
	}

	if src[index] == '0' {
		return ret, index + 1, nil
	}

	for isDigit(src, index) {
		ret = (ret * 10) + int(src[index]-'0')
		index++
		if len(src) <= index {
			break
		}
	}

	if negative {
		ret = -1 * ret
	}

	return ret, index, nil
}
