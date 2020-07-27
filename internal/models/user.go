package models

import (
	"database/sql"

	"git.cipherboy.com/WordCorp/api/internal/database"
	"git.cipherboy.com/WordCorp/api/internal/utils"
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

	result, err := stmt.Exec(user.Eid, user.Username, user.Display, user.Email)
	if err != nil {
		return err
	}

	lastId, err := result.LastInsertId()
	if err != nil {
		return err
	}

	user.Id = uint64(lastId)

	return nil
}

func (user *UserModel) SetPassword(transaction *sql.Tx, password string) error {
	if user.Id == 0 {
		panic("Unitialized user object passed to SetPassword")
	}

	return nil
}
