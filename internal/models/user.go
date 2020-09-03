package models

import (
	"database/sql"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"

	"git.cipherboy.com/WillowPatchGames/wpg/pkg/password"
)

type UserModel struct {
	ID       uint64
	username sql.NullString
	Username string
	Display  string
	email    sql.NullString
	Email    string
	Guest    bool
}

func (user *UserModel) FromID(transaction *sql.Tx, id uint64) error {
	stmt, err := transaction.Prepare(database.GetUserFromID)
	if err != nil {
		return err
	}

	err = stmt.QueryRow(id).Scan(&user.ID, &user.username, &user.Display, &user.email, &user.Guest)
	if err != nil {
		return err
	}

	if user.username.Valid {
		user.Username = user.username.String
	}

	if user.email.Valid {
		user.Email = user.email.String
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

	err = stmt.QueryRow(name).Scan(&user.ID, &user.username, &user.Display, &user.email, &user.Guest)
	if err != nil {
		return err
	}

	if user.username.Valid {
		user.Username = user.username.String
	}

	if user.email.Valid {
		user.Email = user.email.String
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

	err = stmt.QueryRow(mail).Scan(&user.ID, &user.username, &user.Display, &user.email, &user.Guest)
	if err != nil {
		return err
	}

	if user.username.Valid {
		user.Username = user.username.String
	}

	if user.email.Valid {
		user.Email = user.email.String
	}

	err = stmt.Close()
	if err != nil {
		return err
	}

	return nil
}

func (user *UserModel) FromAPIToken(transaction *sql.Tx, token string) error {
	var auth AuthModel
	err := auth.FromAPIToken(transaction, token)
	if err != nil {
		return err
	}

	return user.FromID(transaction, auth.UserID)
}

func (user *UserModel) Create(transaction *sql.Tx) error {
	if !user.Guest {
		stmt, err := transaction.Prepare(database.InsertUser)
		if err != nil {
			return err
		}

		err = stmt.QueryRow(user.Username, user.Display, user.Email, user.Guest).Scan(&user.ID)
		if err != nil {
			return err
		}

		return stmt.Close()
	}

	stmt, err := transaction.Prepare(database.InsertGuest)
	if err != nil {
		return err
	}

	err = stmt.QueryRow(user.Display, user.Guest).Scan(&user.ID)
	if err != nil {
		return err
	}

	return stmt.Close()
}

func (user *UserModel) Save(transaction *sql.Tx) error {
	if user.ID == 0 {
		panic("Unitialized user object passed to Save")
	}

	stmt, err := transaction.Prepare(database.UpdateUser)
	if err != nil {
		return err
	}

	if user.Username == "" {
		user.username.Valid = false
	} else {
		user.username.String = user.Username
		user.username.Valid = true
	}

	if user.Email == "" {
		user.email.Valid = false
	} else {
		user.email.String = user.Email
		user.email.Valid = true
	}

	_, err = stmt.Exec(user.username, user.email, user.Display, user.Guest, user.ID)
	if err != nil {
		return err
	}

	return stmt.Close()
}

func (user *UserModel) SetPassword(transaction *sql.Tx, pass string) error {
	if user.ID == 0 {
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

	_, err = stmt.Exec(user.ID, serialized)
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

	err = stmt.QueryRow(user.ID).Scan(&result)
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
	if user.ID == 0 {
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
