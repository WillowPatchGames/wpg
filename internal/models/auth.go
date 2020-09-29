package models

import (
	"errors"
	"log"

  "gorm.io/gorm"
)

func (token *AuthModel) FromPassword(password string) error {
	err := user.ComparePassword(transaction, password)
	if err != nil {
		return err
	}

	token.APIToken = utils.RandomToken()
	if token.APIToken == "" {
		return errors.New("unable to generate token")
	}

	stmt, err := transaction.Prepare(database.CreateAPIToken)
	if err != nil {
		log.Println("AuthModel.FromPassword(): Preparing query? ", err)
		return err
	}

	_, err = stmt.Exec(user.ID, token.APIToken)
	if err != nil {
		log.Println("AuthModel.FromPassword(): Creating token? ", err)
		return err
	}

	token.UserID = user.ID

	return stmt.Close()
}

func (token *AuthModel) GuestToken() error {
	if !token.User.Guest {
		return nil
	}

	token.APIToken = utils.RandomToken()
	if token.APIToken == "" {
		return errors.New("unable to generate token")
	}

	stmt, err := transaction.Prepare(database.CreateGuestToken)
	if err != nil {
		log.Println("AuthModel.GuestToken(): Preparing query? ", err)
		return err
	}

	_, err = stmt.Exec(user.ID, token.APIToken)
	if err != nil {
		log.Println("AuthModel.FromPassword(): Creating token? ", err)
		return err
	}

	token.UserID = user.ID

	return stmt.Close()
}

func (token *AuthModel) Invalidate(transaction *sql.Tx) error {
	stmt, err := transaction.Prepare(database.InvalidateToken)
	if err != nil {
		log.Println("AuthModel.GuestToken(): Preparing query? ", err)
		return err
	}

	_, err = stmt.Exec(token.APIToken)
	if err != nil {
		log.Println("AuthModel.FromPassword(): Creating token? ", err)
		return err
	}

	return stmt.Close()
}

func (token *AuthModel) FromAPIToken(transaction *sql.Tx, value string) error {
	stmt, err := transaction.Prepare(database.FromAPIToken)
	if err != nil {
		return err
	}

	err = stmt.QueryRow(value).Scan(&token.UserID)
	if err != nil {
		return err
	}

	return stmt.Close()
}
