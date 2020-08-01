package models

import (
	"database/sql"
	"encoding/json"

	"git.cipherboy.com/WordCorp/api/internal/database"
	"git.cipherboy.com/WordCorp/api/internal/utils"
)

type PlayerModel struct {
	Id         uint64
	GameId     uint64
	UserId     uint64
	Class      string
	InviteCode string
}

func (player *PlayerModel) FromId(transaction *sql.Tx, id uint64) error {
	stmt, err := transaction.Prepare(database.GetPlayerFromID)
	if err != nil {
		return err
	}

	err = stmt.QueryRow(id).Scan(&player.Id, &player.GameId, &player.UserId, &player.Class, &player.InviteCode)
	if err != nil {
		return err
	}

	err = stmt.Close()
	if err != nil {
		return err
	}

	return nil
}

func (player *PlayerModel) FromIds(transaction *sql.Tx, game_id uint64, user_id uint64) error {
	stmt, err := transaction.Prepare(database.GetPlayerFromIDs)
	if err != nil {
		return err
	}

	err = stmt.QueryRow(game_id, user_id).Scan(&player.Id, &player.GameId, &player.UserId, &player.Class, &player.InviteCode)
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

	player.Class = "pending"
	player.InviteCode = utils.RandomWords()

	err = stmt.QueryRow(player.GameId, player.UserId, player.Class, player.InviteCode).Scan(&player.Id)
	if err != nil {
		return err
	}

	return stmt.Close()
}

func (player *PlayerModel) GetGame(transaction *sql.Tx) (*GameModel, error) {
	var game *GameModel = new(GameModel)
	err := game.FromId(transaction, player.GameId)
	return game, err
}

func (player *PlayerModel) GetUser(transaction *sql.Tx) (*UserModel, error) {
	var user *UserModel = new(UserModel)
	err := user.FromId(transaction, player.UserId)
	return user, err
}

func (player *PlayerModel) GetState(transaction *sql.Tx, object interface{}) error {
	var serialized string

	stmt, err := transaction.Prepare(database.GetPlayerState)
	if err != nil {
		return err
	}

	err = stmt.QueryRow(player.Id).Scan(&serialized)
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

	_, err = stmt.Exec(string(serialized), player.Id)
	if err != nil {
		return err
	}

	return stmt.Close()
}
