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
var DefaultLen int = 256

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
	ret.R = DefaultN
	ret.P = DefaultP
	ret.Len = DefaultLen

	return ret
}

func (s *Scrypt) Hash(password []byte) error {
	var err error

	s.Salt, err = NewSalt()
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

func (s *Scrypt) Marshal() (string, error) {
	if s.Id == "" || s.Salt == nil || s.Value == nil {
		return "", ErrInvalidObject
	}

	var ret string = "$" + s.Id
	ret += ",N=" + strconv.Itoa(s.N)
	ret += ",r=" + strconv.Itoa(s.R)
	ret += ",p=" + strconv.Itoa(s.P)
	ret += ",len=" + strconv.Itoa(s.Len)
	ret += "$" + base64.URLEncoding.EncodeToString(s.Salt)
	ret += "$" + base64.URLEncoding.EncodeToString(s.Value)

	return ret, nil
}

func (s *Scrypt) unmarshalCheckId(src []byte, index int) (int, error) {
	if len(src) < (index + len(DefaultId)) {
		return index, ErrInvalidSerialization
	}

	if string(src[index:index+len(DefaultId)]) != DefaultId {
		return index, ErrUnknownId
	}

	index += len(DefaultId)

	return index, nil
}

func (s *Scrypt) unmarshalParseParameters(src []byte, index int) (int, error) {
	if len(src) < index {
		return index, ErrInvalidSerialization
	}

	if src[index] == '$' {
		return index, nil
	}

	if src[index] != ',' {
		return index, ErrInvalidSerialization
	}

	index += 1

	if index >= len(src) {
		return index, ErrInvalidObject
	}

	var canFitLen = index+3 < len(src)

	if src[index] == 'N' {
		// Parse N
		index += 1
	} else if src[index] == 'r' {
		// Parse r
		index += 1
	} else if src[index] == 'p' {
		// Parse p
		index += 1
	} else if canFitLen && src[index] == 'l' && src[index+1] == 'e' && src[index+2] == 'n' {
		// Parse len
		index += 3
	}

	return s.unmarshalParseParameters(src, index)
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

	return nil
}
