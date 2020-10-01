package database

import (
	"testing"

	"gorm.io/gorm"
)

func TestCreateUser(t *testing.T) {
	if err := OpenDatabase("sqlite", "file::memory:?cache=shared", false); err != nil {
		t.Fatal(err)
	}

	var password = "letmein"

	var user User
	user.Username.Valid = true
	user.Username.String = "cipherboy"
	user.Email.Valid = true
	user.Email.String = "alexander.m.scheel@gmail.com"

	if err := InTransaction(func(tx *gorm.DB) error {
		if err := tx.Create(&user).Error; err != nil {
			return err
		}

		if err := SetPassword(tx, &user, password); err != nil {
			return err
		}

		return nil
	}); err != nil {
		t.Fatal(err)
	}

	if user.ID == 0 {
		t.Fatal("Expected ID to be assigned to user")
	}

	var auth Auth
	var dbuser User

	if err := InTransaction(func(tx *gorm.DB) error {
		if err := tx.First(&dbuser, user.ID).Error; err != nil {
			return err
		}

		return FromPassword(tx, &dbuser, &auth, password)
	}); err != nil {
		t.Fatal(err)
	}

	if dbuser.ID == 0 {
		t.Fatal("Expected ID to be assigned to user")
	}

	if auth.ID == 0 {
		t.Fatal("Expected ID to be assigned to auth")
	}

	if dbuser.Username != user.Username {
		t.Fatal("Unable to validate user was stored correctly!")
	}

	if dbuser.Email != user.Email {
		t.Fatal("Unable to validate user was stored correctly!")
	}

	var token = auth.Key
	var dbauth Auth
	var authuser User

	if err := InTransaction(func(tx *gorm.DB) error {
		if err := tx.First(&dbauth, "category = ? AND key = ?", "api-token", token).Error; err != nil {
			return err
		}

		if err := tx.First(&authuser, dbauth.UserID).Error; err != nil {
			return err
		}

		return nil
	}); err != nil {
		t.Fatal(err)
	}

	if authuser.Username != user.Username {
		t.Fatal("Unable to validate user was stored correctly!")
	}

	if authuser.Email != user.Email {
		t.Fatal("Unable to validate user was stored correctly!")
	}
}
