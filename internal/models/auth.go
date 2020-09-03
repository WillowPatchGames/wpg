package models

import (
	"database/sql"
	"errors"
	"log"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
	"git.cipherboy.com/WillowPatchGames/wpg/internal/utils"
)

type AuthModel struct {
	UserID   uint64
	APIToken string
}

func (token *AuthModel) FromPassword(transaction *sql.Tx, user UserModel, password string) error {
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

func (token *AuthModel) GuestToken(transaction *sql.Tx, user UserModel) error {
	if !user.Guest {
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
