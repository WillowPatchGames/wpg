package password

import (
	"crypto/subtle"
	"encoding/base64"
	"strconv"

	"golang.org/x/crypto/scrypt"
)

var DefaultId string = "scrypt"
var DefaultN int = 1 << 15
var DefaultR int = 8
var DefaultP int = 1
var DefaultLen int = 256 / 8

type Scrypt struct {
	Crypt

	N   int
	R   int
	P   int
	Len int
}

func NewScrypt() *Scrypt {
	var ret *Scrypt = new(Scrypt)

	ret.Id = DefaultId
	ret.N = DefaultN
	ret.R = DefaultR
	ret.P = DefaultP
	ret.Len = DefaultLen

	return ret
}

func (s *Scrypt) Hash(password []byte) error {
	var err error

	s.Salt, err = NewSalt(s.Len)
	if err != nil {
		return err
	}

	s.Value, err = scrypt.Key(password, s.Salt, s.N, s.R, s.P, s.Len)
	if err != nil {
		return err
	}

	return nil
}

func (s *Scrypt) Compare(password []byte) error {
	var err error
	var this []byte

	this, err = scrypt.Key(password, s.Salt, s.N, s.R, s.P, s.Len)
	if err != nil {
		return err
	}

	if subtle.ConstantTimeCompare(s.Value, this) == 0 {
		return ErrPasswordMismatch
	}

	return nil
}

func (s *Scrypt) Marshal() ([]byte, error) {
	if s.Id == "" || s.Salt == nil || s.Value == nil {
		return nil, ErrInvalidObject
	}

	var ret string = "$" + s.Id
	ret += ",N=" + strconv.Itoa(s.N)
	ret += ",r=" + strconv.Itoa(s.R)
	ret += ",p=" + strconv.Itoa(s.P)
	ret += ",len=" + strconv.Itoa(s.Len)
	ret += "$" + base64.URLEncoding.EncodeToString(s.Salt)
	ret += "$" + base64.URLEncoding.EncodeToString(s.Value)

	return []byte(ret), nil
}

func (s *Scrypt) unmarshalCheckId(src []byte, index int) (int, error) {
	if len(src) <= index {
		return index, ErrInvalidSerialization
	}

	var startIndex = index
	var endIndex = index

	for len(src) > endIndex {
		if src[endIndex] == ',' || src[endIndex] == '$' {
			break
		}

		endIndex += 1
	}

	if startIndex == endIndex {
		return index, ErrInvalidSerialization
	}

	s.Id = string(src[startIndex:endIndex])

	return endIndex, nil
}

func (s *Scrypt) unmarshalParseParameters(src []byte, index int) (int, error) {
	var err error

	for {
		if len(src) <= index {
			return index, ErrInvalidSerialization
		}
		if src[index] == '$' {
			break
		}
		if src[index] != ',' {
			return index, ErrInvalidSerialization
		}
		index += 1

		if len(src) <= index {
			return index, ErrInvalidSerialization
		}

		if len(src) <= index+2 {
			return index, ErrInvalidSerialization
		}

		var canFitLen = index+4 < len(src)

		if src[index] == 'N' && src[index+1] == '=' {
			index += 2

			s.N, index, err = parseInt(src, index)
			if err != nil {
				return index, err
			}

			if s.N <= 0 {
				return index, ErrInvalidObject
			}
		} else if src[index] == 'r' && src[index+1] == '=' {
			index += 2

			s.R, index, err = parseInt(src, index)
			if err != nil {
				return index, err
			}

			if s.R <= 0 {
				return index, ErrInvalidObject
			}
		} else if src[index] == 'p' && src[index+1] == '=' {
			index += 2

			s.P, index, err = parseInt(src, index)
			if err != nil {
				return index, err
			}

			if s.P <= 0 {
				return index, ErrInvalidObject
			}
		} else if canFitLen && src[index] == 'l' && src[index+1] == 'e' && src[index+2] == 'n' && src[index+3] == '=' {
			index += 4

			s.Len, index, err = parseInt(src, index)
			if err != nil {
				return index, err
			}

			if s.Len <= 0 {
				return index, ErrInvalidObject
			}
		} else {
			return index, ErrInvalidSerialization
		}
	}

	return index, nil
}

func (s *Scrypt) unmarshalParseBase64(src []byte, index int) ([]byte, int, error) {
	if len(src) <= index {
		return nil, index, ErrInvalidSerialization
	}

	var startIndex = index
	var endIndex = index

	for len(src) > endIndex {
		if !isBase64Digit(src, endIndex) {
			break
		}

		endIndex += 1
	}

	if startIndex == endIndex {
		return nil, index, ErrInvalidSerialization
	}

	var dataLen = base64.URLEncoding.DecodedLen(endIndex - startIndex)
	var data []byte = make([]byte, dataLen)

	_, err := base64.URLEncoding.Decode(data, src[startIndex:endIndex])
	if err != nil {
		return nil, index, err
	}

	return data, endIndex, nil
}

func (s *Scrypt) Unmarshal(src []byte) error {
	var index = 0
	var err error

	if src[index] != '$' {
		return ErrInvalidSerialization
	}
	index += 1

	index, err = s.unmarshalCheckId(src, index)
	if err != nil {
		return err
	}

	index, err = s.unmarshalParseParameters(src, index)
	if err != nil {
		return err
	}

	if len(src) <= index {
		return ErrInvalidSerialization
	}

	if src[index] != '$' {
		return ErrInvalidSerialization
	}
	index += 1

	s.Salt, index, err = s.unmarshalParseBase64(src, index)
	if err != nil {
		return err
	}

	if len(s.Salt) < s.Len {
		return ErrInvalidSerialization
	}

	s.Salt = s.Salt[0:s.Len]

	if len(src) <= index {
		return ErrInvalidSerialization
	}

	if src[index] != '$' {
		return ErrInvalidSerialization
	}
	index += 1

	s.Value, _, err = s.unmarshalParseBase64(src, index)
	if err != nil {
		return err
	}

	if len(s.Value) < s.Len {
		return ErrInvalidSerialization
	}

	s.Value = s.Value[0:s.Len]

	return nil
}
