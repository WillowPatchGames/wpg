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

func (user *UserModel) FromEid(transaction *sql.Tx, id uint64) error {
	stmt, err := transaction.Prepare(database.GetUserFromEID)
	if err != nil {
		return err
	}

	err = stmt.QueryRow(id).Scan(&user.Id, &user.Eid, &user.Username, &user.Display, &user.Email)
	if err != nil {
		return err
	}

	err = stmt.Close()
	if err != nil {
		return err
	}

	return nil
}

func (user *UserModel) FromUsername(transaction *sql.Tx, name string) error {
	stmt, err := transaction.Prepare(database.GetUserFromUsername)
	if err != nil {
		return err
	}

	err = stmt.QueryRow(name).Scan(&user.Id, &user.Eid, &user.Username, &user.Display, &user.Email)
	if err != nil {
		return err
	}

	err = stmt.Close()
	if err != nil {
		return err
	}

	return nil
}

func (user *UserModel) FromEmail(transaction *sql.Tx, mail string) error {
	stmt, err := transaction.Prepare(database.GetUserFromEmail)
	if err != nil {
		return err
	}

	err = stmt.QueryRow(mail).Scan(&user.Id, &user.Eid, &user.Username, &user.Display, &user.Email)
	if err != nil {
		return err
	}

	err = stmt.Close()
	if err != nil {
		return err
	}

	return nil
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

	return stmt.Close()
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

	return stmt.Close()
}

func (user *UserModel) getPassword(transaction *sql.Tx) (string, error) {
	var result string
	var err error

	stmt, err := transaction.Prepare(database.GetPassword)
	if err != nil {
		return "", err
	}

	err = stmt.QueryRow(user.Id).Scan(&result)
	if err != nil {
		return "", err
	}

	err = stmt.Close()
	if err != nil {
		return result, err
	}

	return result, nil
}

func (user *UserModel) ComparePassword(transaction *sql.Tx, given string) error {
	if user.Id == 0 {
		panic("Uninitialized user object passed to ComparePassword")
	}

	serialization, err := user.getPassword(transaction)
	if err != nil {
		return err
	}

	var crypter *password.Scrypt = password.NewScrypt()

	err = crypter.Unmarshal([]byte(serialization))
	if err != nil {
		return err
	}

	return crypter.Compare([]byte(given))
}
