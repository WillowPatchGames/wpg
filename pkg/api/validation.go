package api

import (
	"errors"
	"strconv"
	"unicode"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
)

// Validate a given username is ok for use. We assume it is at most 30
// characters long, contains no spaces, and contains no non-printable/control
// characters.
func ValidateUsername(username string) error {
	// Treat no username as valid.
	if len(username) == 0 {
		return nil
	}

	rUsername := []rune(username)
	for index, char := range rUsername {
		if unicode.IsSpace(char) {
			return errors.New("username not allowed; character at index " + strconv.Itoa(index) + " is a space: " + string(char))
		} else if !unicode.IsPrint(char) {
			return errors.New("username not allowed; character at index " + strconv.Itoa(index) + " is not printable: " + string(char))
		} else if unicode.IsControl(char) {
			return errors.New("username not allowed; character at index " + strconv.Itoa(index) + " is a control character: " + string(char))
		} else if char == '@' {
			return errors.New("username not allowed; character at index " + strconv.Itoa(index) + " is an '@' symbol; makes the username look like an email")
		}
	}

	if len(rUsername) > 30 {
		return errors.New("username exceeds 30 characters; choose a shorter username and longer display name")
	}

	return nil
}

// Validate a given email is ok for use. Currently validation is limited to
// ensuring it has an '@' sign.
//
// XXX: Add better validation here; likely includes updating database schema to
// include a verified boolean and actually sending an email to the user. This
// should be fixed when SES support is added.
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

// Validate a given display name is ok for use. Currently ensures that it
// is at most 100 characters long, and contains no non-printable/control
// characters. Unlike username (which is interchangeable with email for
// identifying the account), display name must also be non-empty.
func ValidateDisplayName(displayName string) error {
	if len(displayName) == 0 {
		return errors.New("missing display name; must not be empty")
	}

	rDisplayName := []rune(displayName)
	for index, char := range rDisplayName {
		if unicode.IsControl(char) {
			return errors.New("invalid display name; character at index " + strconv.Itoa(index) + " is a control character: " + string(char))
		} else if !unicode.IsPrint(char) {
			return errors.New("invalid display name; character at index " + strconv.Itoa(index) + " is not printable: " + string(char))
		}
	}

	if len(displayName) > 100 {
		return errors.New("display name exceeds 100 characters")
	}

	return nil
}

// Whether or not a given user can modify another user.
func UserCanModifyUser(actor database.User, target database.User) error {
	// Currently we only allow first-party actions.
	if actor.ID == target.ID {
		return nil
	}

	return errors.New("user unauthorized to perform specified action")
}

// Whether or not, in a given room, a user can create a game.
func UserCanCreateGame(actor database.User, room database.Room) error {
	// Currently we only allow first-party actions.
	if actor.ID == room.OwnerID {
		return nil
	}

	return errors.New("user unauthorized to perform specified action")
}
