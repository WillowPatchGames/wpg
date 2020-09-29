package models

import (
	"database/sql"
	"time"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"

	"git.cipherboy.com/WillowPatchGames/wpg/pkg/password"
)


func (user *UserModel) SetPassword(pass string) error {
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

func (user *UserModel) LoadConfig(transaction *sql.Tx) error {
	if user.ID == 0 {
		panic("Uninitialized user object passed to LoadConfig")
	}

	var config UserConfigModel

	stmt, err := transaction.Prepare(database.GetConfig)
	if err != nil {
		return err
	}

	config.GravatarHash = ""
	err = stmt.QueryRow(user.ID, "gravatar-hash").Scan(&config.gravatarHash)
	if err == nil && config.gravatarHash.Valid {
		config.GravatarHash = config.gravatarHash.String
	}

	user.Config = &config

	return nil
}

func (user *UserModel) SetConfig(transaction *sql.Tx) error {
	if user.ID == 0 || user.Config == nil {
		panic("Uninitialized user object passed to SetConfig")
	}

	if user.Config.GravatarHash == "" {
		user.Config.gravatarHash.Valid = false
	} else {
		user.Config.gravatarHash.String = user.Config.GravatarHash
		user.Config.gravatarHash.Valid = true
	}

	stmt, err := transaction.Prepare(database.UpdateIsertConfig)
	if err != nil {
		return err
	}

	_, err = stmt.Exec(user.ID, "gravatar-hash", user.Config.gravatarHash)
	if err != nil {
		return err
	}

	return nil
}
