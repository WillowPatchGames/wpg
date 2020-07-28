package password

import (
	"testing"
)

func TestMarshal(t *testing.T) {
	var obj *Scrypt = NewScrypt()

	obj.Id = "scrypt"
	obj.N = 1
	obj.R = 2
	obj.P = 3
	obj.Len = 4
	obj.Salt = []byte{0, 1, 2}
	obj.Value = []byte{3, 4, 5}

	var expected = "$scrypt,N=1,r=2,p=3,len=4$AAEC$AwQF"
	actual, err := obj.Marshal()

	if err != nil {
		t.Error(err)
	}

	if string(actual) != expected {
		t.Error("Expected " + expected + " but got " + string(actual))
	}
}

func TestUnmarshal(t *testing.T) {
	var input = "$scrypt,N=1,r=2,p=3,len=4$AAEC$AwQF"

	var obj *Scrypt = NewScrypt()
	err := obj.Unmarshal([]byte(input))

	if err != nil {
		t.Error(err)
	}

	if obj.Id != "scrypt" {
		t.Error(err)
	}

	if obj.N != 1 {
		t.Error("Expected Scrypt.N to be 1")
	}

	if obj.R != 2 {
		t.Error("Expected Scrypt.R to be 2")
	}

	if obj.P != 3 {
		t.Error("Expected Scrypt.P to be 3")
	}

	if obj.Len != 4 {
		t.Error("Expected Scrypt.N to be 4")
	}
}

func TestCreateChecK(t *testing.T) {
	var obj *Scrypt = NewScrypt()

	var pass []byte = []byte("something")
	var other []byte = []byte("else")

	err := obj.Hash(pass)
	if err != nil {
		t.Error("Expected nil err!")
	}

	err = obj.Compare(pass)
	if err != nil {
		t.Error("Expected nil err attempting to compare same password!")
	}

	err = obj.Compare(other)
	if err != ErrPasswordMismatch {
		t.Error("Expected ErrPasswordMismatch err attempting to compare wrong password!")
	}

	err = obj.Hash(other)
	if err != nil {
		t.Error("Expected nil err!")
	}

	err = obj.Compare(pass)
	if err != ErrPasswordMismatch {
		t.Error("Expected ErrPasswordMismatch err attempting to compare wrong password!")
	}

	err = obj.Compare(other)
	if err != nil {
		t.Error("Expected nil err attempting to compare same password!")
	}
}
