package models

import (
	"database/sql"
	"errors"
	"log"

	"git.cipherboy.com/WordCorp/api/internal/database"
	"git.cipherboy.com/WordCorp/api/internal/utils"
)

type AuthModel struct {
	UserId   uint64
	ApiToken string
}

func (token *AuthModel) FromPassword(transaction *sql.Tx, user UserModel, password string) error {
	err := user.ComparePassword(transaction, password)
	if err != nil {
		return err
	}

	token.ApiToken = utils.RandomToken()
	if token.ApiToken == "" {
		return errors.New("unable to generate token")
	}

	stmt, err := transaction.Prepare(database.CreateAPIToken)
	if err != nil {
		log.Println("AuthModel.FromPassword(): Preparing query? ", err)
		return err
	}

	_, err = stmt.Exec(user.Id, token.ApiToken)
	if err != nil {
		log.Println("AuthModel.FromPassword(): Creating token? ", err)
		return err
	}

	token.UserId = user.Id

	return stmt.Close()
}

func (token *AuthModel) GuestToken(transaction *sql.Tx, user UserModel) error {
	if !user.Guest {
		return nil
	}

	token.ApiToken = utils.RandomToken()
	if token.ApiToken == "" {
		return errors.New("unable to generate token")
	}

	stmt, err := transaction.Prepare(database.CreateGuestToken)
	if err != nil {
		log.Println("AuthModel.GuestToken(): Preparing query? ", err)
		return err
	}

	_, err = stmt.Exec(user.Id, token.ApiToken)
	if err != nil {
		log.Println("AuthModel.FromPassword(): Creating token? ", err)
		return err
	}

	token.UserId = user.Id

	return stmt.Close()
}

func (token *AuthModel) Invalidate(transaction *sql.Tx) error {
	stmt, err := transaction.Prepare(database.InvalidateToken)
	if err != nil {
		log.Println("AuthModel.GuestToken(): Preparing query? ", err)
		return err
	}

	_, err = stmt.Exec(token.ApiToken)
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

	err = stmt.QueryRow(value).Scan(&token.UserId)
	if err != nil {
		return err
	}

	return stmt.Close()
}
