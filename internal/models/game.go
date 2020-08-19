package models

import (
	"database/sql"
	"encoding/json"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
	"git.cipherboy.com/WillowPatchGames/wpg/internal/utils"
)

type GameModel struct {
	Id        uint64
	Eid       uint64
	OwnerId   uint64
	RoomId    uint64
	Style     string
	Open      bool
	JoinCode  string
	Lifecycle string
}

func (game *GameModel) FromId(transaction *sql.Tx, id uint64) error {
	stmt, err := transaction.Prepare(database.GetGameFromID)
	if err != nil {
		return err
	}

	err = stmt.QueryRow(id).Scan(&game.Id, &game.Eid, &game.OwnerId, &game.RoomId, &game.Style, &game.Open, &game.JoinCode, &game.Lifecycle)
	if err != nil {
		return err
	}

	err = stmt.Close()
	if err != nil {
		return err
	}

	return nil
}

func (game *GameModel) FromEid(transaction *sql.Tx, id uint64) error {
	stmt, err := transaction.Prepare(database.GetGameFromEID)
	if err != nil {
		return err
	}

	err = stmt.QueryRow(id).Scan(&game.Id, &game.Eid, &game.OwnerId, &game.RoomId, &game.Style, &game.Open, &game.JoinCode, &game.Lifecycle)
	if err != nil {
		return err
	}

	err = stmt.Close()
	if err != nil {
		return err
	}

	return nil
}

func (game *GameModel) FromJoinCode(transaction *sql.Tx, code string) error {
	stmt, err := transaction.Prepare(database.GetGameFromCode)
	if err != nil {
		return err
	}

	err = stmt.QueryRow(code).Scan(&game.Id, &game.Eid, &game.OwnerId, &game.RoomId, &game.Style, &game.Open, &game.JoinCode, &game.Lifecycle)
	if err != nil {
		return err
	}

	err = stmt.Close()
	if err != nil {
		return err
	}

	return nil
}

func (game *GameModel) Create(transaction *sql.Tx) error {
	stmt, err := transaction.Prepare(database.InsertGame)
	if err != nil {
		return err
	}

	game.Eid = utils.RandomId()
	if game.Open {
		game.JoinCode = utils.RandomWords()
	}

	game.Lifecycle = "pending"

	err = stmt.QueryRow(game.Eid, game.OwnerId, game.RoomId, game.Style, game.Open, game.JoinCode).Scan(&game.Id)
	if err != nil {
		return err
	}

	return stmt.Close()
}

func (game *GameModel) Save(transaction *sql.Tx) error {
	stmt, err := transaction.Prepare(database.SaveGame)
	if err != nil {
		return err
	}

	_, err = stmt.Exec(game.Style, game.Lifecycle, game.Id)
	if err != nil {
		return err
	}

	return stmt.Close()
}

func (game *GameModel) GetOwner(transaction *sql.Tx) (*UserModel, error) {
	var user *UserModel = new(UserModel)
	err := user.FromId(transaction, game.OwnerId)
	return user, err
}

func (game *GameModel) GetRoom(transaction *sql.Tx) (*RoomModel, error) {
	var room *RoomModel = new (RoomModel)
	err := room.FromId(transaction, game.RoomId)
	return room, err
}

func (game *GameModel) GetConfig(transaction *sql.Tx, object interface{}) error {
	var serialized string

	stmt, err := transaction.Prepare(database.GetGameConfig)
	if err != nil {
		return err
	}

	err = stmt.QueryRow(game.Id).Scan(&serialized)
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

	_, err = stmt.Exec(string(serialized), game.Id)
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

	err = stmt.QueryRow(game.Id).Scan(&serialized)
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

	_, err = stmt.Exec(string(serialized), game.Id)
	if err != nil {
		return err
	}

	return stmt.Close()
}
