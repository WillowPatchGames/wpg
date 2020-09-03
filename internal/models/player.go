package models

import (
	"database/sql"
	"encoding/json"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
	"git.cipherboy.com/WillowPatchGames/wpg/internal/utils"
)

type PlayerModel struct {
	ID         uint64
	GameID     uint64
	UserID     uint64
	Class      string
	InviteCode string
}

func (player *PlayerModel) FromID(transaction *sql.Tx, id uint64) error {
	stmt, err := transaction.Prepare(database.GetPlayerFromID)
	if err != nil {
		return err
	}

	err = stmt.QueryRow(id).Scan(&player.ID, &player.GameID, &player.UserID, &player.Class, &player.InviteCode)
	if err != nil {
		return err
	}

	err = stmt.Close()
	if err != nil {
		return err
	}

	return nil
}

func (player *PlayerModel) FromIDs(transaction *sql.Tx, gameID uint64, userID uint64) error {
	stmt, err := transaction.Prepare(database.GetPlayerFromIDs)
	if err != nil {
		return err
	}

	err = stmt.QueryRow(gameID, userID).Scan(&player.ID, &player.GameID, &player.UserID, &player.Class, &player.InviteCode)
	if err != nil {
		return err
	}

	err = stmt.Close()
	if err != nil {
		return err
	}

	return nil
}

func (player *PlayerModel) Create(transaction *sql.Tx) error {
	stmt, err := transaction.Prepare(database.InsertPlayer)
	if err != nil {
		return err
	}

	if player.Class == "" {
		player.Class = "pending"
	}
	player.InviteCode = utils.RandomWords()

	err = stmt.QueryRow(player.GameID, player.UserID, player.Class, player.InviteCode).Scan(&player.ID)
	if err != nil {
		return err
	}

	return stmt.Close()
}

func (player *PlayerModel) Save(transaction *sql.Tx) error {
	stmt, err := transaction.Prepare(database.SavePlayer)
	if err != nil {
		return err
	}

	_, err = stmt.Exec(player.Class, player.ID)
	if err != nil {
		return err
	}

	return stmt.Close()
}

func (player *PlayerModel) GetGame(transaction *sql.Tx) (*GameModel, error) {
	var game *GameModel = new(GameModel)
	err := game.FromID(transaction, player.GameID)
	return game, err
}

func (player *PlayerModel) GetUser(transaction *sql.Tx) (*UserModel, error) {
	var user *UserModel = new(UserModel)
	err := user.FromID(transaction, player.UserID)
	return user, err
}

func (player *PlayerModel) GetState(transaction *sql.Tx, object interface{}) error {
	var serialized string

	stmt, err := transaction.Prepare(database.GetPlayerState)
	if err != nil {
		return err
	}

	err = stmt.QueryRow(player.ID).Scan(&serialized)
	if err != nil {
		return err
	}

	err = stmt.Close()
	if err != nil {
		return err
	}

	return json.Unmarshal([]byte(serialized), object)
}

func (player *PlayerModel) SetState(transaction *sql.Tx, object interface{}) error {
	var serialized []byte

	serialized, err := json.Marshal(object)
	if err != nil {
		return err
	}

	stmt, err := transaction.Prepare(database.SetPlayerState)
	if err != nil {
		return err
	}

	_, err = stmt.Exec(string(serialized), player.ID)
	if err != nil {
		return err
	}

	return stmt.Close()
}
