package models

import (
	"database/sql"

	"git.cipherboy.com/WordCorp/api/internal/database"
	"git.cipherboy.com/WordCorp/api/internal/utils"

	"git.cipherboy.com/WordCorp/api/pkg/password"
)

type UserModel struct {
	Id       uint64
	Eid      uint64
	Username string
	Display  string
	Email    string
}

func FromEid(transaction *sql.Tx, id uint64) (*UserModel, error) {
	var user *UserModel = new(UserModel)

	stmt, err := transaction.Prepare(database.GetUserFromEID)
	if err != nil {
		return nil, err
	}

	err = stmt.QueryRow(id).Scan(&user.Id, &user.Eid, &user.Username, &user.Display, &user.Email)
	if err != nil {
		return nil, err
	}

	return user, nil
}

func (user *UserModel) Create(transaction *sql.Tx) error {
	stmt, err := transaction.Prepare(database.InsertUser)
	if err != nil {
		return err
	}

	user.Eid = utils.RandomId()

	err = stmt.QueryRow(user.Eid, user.Username, user.Display, user.Email).Scan(&user.Id)
	if err != nil {
		return err
	}

	return nil
}

func (user *UserModel) SetPassword(transaction *sql.Tx, pass string) error {
	if user.Id == 0 {
		panic("Unitialized user object passed to SetPassword")
	}

	var crypter *password.Scrypt = password.NewScrypt()

	err := crypter.Hash([]byte(pass))
	if err != nil {
		return err
	}

	serialized, err := crypter.Marshal()
	if err != nil {
		return err
	}

	stmt, err := transaction.Prepare(database.SetPassword)
	if err != nil {
		return err
	}

	_, err = stmt.Exec(user.Id, serialized)
	if err != nil {
		return err
	}

	return nil
}
