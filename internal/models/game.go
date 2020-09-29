package models

import (
	"database/sql"
	"encoding/json"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
	"git.cipherboy.com/WillowPatchGames/wpg/internal/utils"
)

func (game *GameModel) GetConfig(transaction *sql.Tx, object interface{}) error {
	var serialized string

	stmt, err := transaction.Prepare(database.GetGameConfig)
	if err != nil {
		return err
	}

	err = stmt.QueryRow(game.ID).Scan(&serialized)
	if err != nil {
		return err
	}

	err = stmt.Close()
	if err != nil {
		return err
	}

	return json.Unmarshal([]byte(serialized), object)
}

func (game *GameModel) SetConfig(transaction *sql.Tx, object interface{}) error {
	var serialized []byte

	serialized, err := json.Marshal(object)
	if err != nil {
		return err
	}

	stmt, err := transaction.Prepare(database.SetGameConfig)
	if err != nil {
		return err
	}

	_, err = stmt.Exec(string(serialized), game.ID)
	if err != nil {
		return err
	}

	return stmt.Close()
}

func (game *GameModel) GetState(transaction *sql.Tx, object interface{}) error {
	var serialized string

	stmt, err := transaction.Prepare(database.GetGameState)
	if err != nil {
		return err
	}

	err = stmt.QueryRow(game.ID).Scan(&serialized)
	if err != nil {
		return err
	}

	err = stmt.Close()
	if err != nil {
		return err
	}

	return json.Unmarshal([]byte(serialized), object)
}

func (game *GameModel) SetState(transaction *sql.Tx, object interface{}) error {
	var serialized []byte

	serialized, err := json.Marshal(object)
	if err != nil {
		return err
	}

	stmt, err := transaction.Prepare(database.SetGameState)
	if err != nil {
		return err
	}

	_, err = stmt.Exec(string(serialized), game.ID)
	if err != nil {
		return err
	}

	return stmt.Close()
}
