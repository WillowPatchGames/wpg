package models

import (
	"database/sql"
	"errors"

	"git.cipherboy.com/WordCorp/api/internal/database"
	"git.cipherboy.com/WordCorp/api/internal/utils"
)

type AuthModel struct {
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
		return err
	}

	_, err = stmt.Exec(user.Id, token.ApiToken)
	if err != nil {
		return err
	}

	return stmt.Close()
}
