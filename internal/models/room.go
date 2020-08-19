package models

import (
	"database/sql"
	"encoding/json"

	"git.cipherboy.com/WillowPatchGames/api/internal/database"
	"git.cipherboy.com/WillowPatchGames/api/internal/utils"
)

type RoomModel struct {
	Id        uint64
	Eid       uint64
	OwnerId   uint64
	Style     string
	Open      bool
	JoinCode  string
}

func (room *RoomModel) FromId(transaction *sql.Tx, id uint64) error {
	stmt, err := transaction.Prepare(database.GetRoomFromID)
	if err != nil {
		return err
	}

	err = stmt.QueryRow(id).Scan(&room.Id, &room.Eid, &room.OwnerId, &room.Style, &room.Open, &room.JoinCode)
	if err != nil {
		return err
	}

	err = stmt.Close()
	if err != nil {
		return err
	}

	return nil
}

func (room *RoomModel) FromEid(transaction *sql.Tx, id uint64) error {
	stmt, err := transaction.Prepare(database.GetRoomFromEID)
	if err != nil {
		return err
	}

	err = stmt.QueryRow(id).Scan(&room.Id, &room.Eid, &room.OwnerId, &room.Style, &room.Open, &room.JoinCode)
	if err != nil {
		return err
	}

	err = stmt.Close()
	if err != nil {
		return err
	}

	return nil
}

func (room *RoomModel) FromJoinCode(transaction *sql.Tx, code string) error {
	stmt, err := transaction.Prepare(database.GetRoomFromCode)
	if err != nil {
		return err
	}

	err = stmt.QueryRow(code).Scan(&room.Id, &room.Eid, &room.OwnerId, &room.Style, &room.Open, &room.JoinCode)
	if err != nil {
		return err
	}

	err = stmt.Close()
	if err != nil {
		return err
	}

	return nil
}

func (room *RoomModel) Create(transaction *sql.Tx) error {
	stmt, err := transaction.Prepare(database.InsertRoom)
	if err != nil {
		return err
	}

	room.Eid = utils.RandomId()
	if room.Open {
		room.JoinCode = utils.RandomWords()
	}

	err = stmt.QueryRow(room.Eid, room.OwnerId, room.Style, room.Open, room.JoinCode).Scan(&room.Id)
	if err != nil {
		return err
	}

	return stmt.Close()
}

func (room *RoomModel) Save(transaction *sql.Tx) error {
	stmt, err := transaction.Prepare(database.SaveRoom)
	if err != nil {
		return err
	}

	_, err = stmt.Exec(room.Style, room.Id)
	if err != nil {
		return err
	}

	return stmt.Close()
}

func (room *RoomModel) GetOwner(transaction *sql.Tx) (*UserModel, error) {
	var user *UserModel = new(UserModel)
	err := user.FromId(transaction, room.OwnerId)
	return user, err
}

func (room *RoomModel) GetCurrentGame(transaction *sql.Tx) (*GameModel, error) {
	var game_id uint64
	var err error

	stmt, err := transaction.Prepare(database.GetRoomCurrentGame)
	if err != nil {
		return nil, err
	}

	err = stmt.QueryRow(room.Id).Scan(&game_id)
	if err != nil {
		return nil, err
	}

	err = stmt.Close()
	if err != nil {
		return nil, err
	}

	var game *GameModel = new(GameModel)
	err = game.FromId(transaction, game_id)
	return game, err
}

func (room *RoomModel) GetConfig(transaction *sql.Tx, object interface{}) error {
	var serialized string

	stmt, err := transaction.Prepare(database.GetRoomConfig)
	if err != nil {
		return err
	}

	err = stmt.QueryRow(room.Id).Scan(&serialized)
	if err != nil {
		return err
	}

	err = stmt.Close()
	if err != nil {
		return err
	}

	return json.Unmarshal([]byte(serialized), object)
}

func (room *RoomModel) SetConfig(transaction *sql.Tx, object interface{}) error {
	var serialized []byte

	serialized, err := json.Marshal(object)
	if err != nil {
		return err
	}

	stmt, err := transaction.Prepare(database.SetRoomConfig)
	if err != nil {
		return err
	}

	_, err = stmt.Exec(string(serialized), room.Id)
	if err != nil {
		return err
	}

	return stmt.Close()
}
