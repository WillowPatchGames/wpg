package api

import (
	"errors"
	"strconv"
	"unicode"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/models"
)

func ValidateUsername(username string) error {
	// Treat no username as valid.
	if len(username) == 0 {
		return nil
	}

	rUsername := []rune(username)
	for index, char := range rUsername {
		if unicode.IsSpace(char) {
			return errors.New("character at index " + strconv.Itoa(index) + " is a space: " + string(char))
		} else if !unicode.IsPrint(char) {
			return errors.New("character at index " + strconv.Itoa(index) + " is not printable: " + string(char))
		} else if unicode.IsControl(char) {
			return errors.New("character at index " + strconv.Itoa(index) + " is a control character: " + string(char))
		}
	}

	if len(rUsername) > 30 {
		return errors.New("username exceeds 30 characters; choose a shorter username and longer display name")
	}

	return nil
}

func ValidateEmail(email string) error {
	// Treat no email is valid.
	if len(email) == 0 {
		return nil
	}

	var haveAt bool = false
	bEmail := []byte(email)
	for _, char := range bEmail {
		if char == '@' {
			haveAt = true
			break
		}
	}

	if !haveAt {
		return errors.New("invalid email address: missing @ symbol")
	}

	return nil
}

func ValidateDisplayName(displayName string) error {
	if len(displayName) == 0 {
		return errors.New("missing display name; must not be empty")
	}

	rDisplayName := []rune(displayName)
	for index, char := range rDisplayName {
		if unicode.IsControl(char) {
			return errors.New("character at index " + strconv.Itoa(index) + " is a control character: " + string(char))
		} else if !unicode.IsPrint(char) {
			return errors.New("character at index " + strconv.Itoa(index) + " is not printable: " + string(char))
		}
	}

	if len(displayName) > 100 {
		return errors.New("display name exceeds 100 characters")
	}

	return nil
}

func UserCanModifyUser(actor models.UserModel, target models.UserModel) error {
	// Currently we only allow first-party actions.
	if actor.ID == target.ID {
		return nil
	}

	return errors.New("user unauthorized to perform specified action")
}

func UserCanCreateGame(actor models.UserModel, room models.RoomModel) error {
	// Currently we only allow first-party actions.
	if actor.ID == room.OwnerID {
		return nil
	}

	return errors.New("user unauthorized to perform specified action")
}
