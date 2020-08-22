package models

import (
	"database/sql"
	"encoding/json"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
	"git.cipherboy.com/WillowPatchGames/wpg/internal/utils"
)

type RoomModel struct {
	Id       uint64
	OwnerId  uint64
	Style    string
	Open     bool
	JoinCode string
}

func (room *RoomModel) FromId(transaction *sql.Tx, id uint64) error {
	stmt, err := transaction.Prepare(database.GetRoomFromID)
	if err != nil {
		return err
	}

	err = stmt.QueryRow(id).Scan(&room.Id, &room.OwnerId, &room.Style, &room.Open, &room.JoinCode)
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

	err = stmt.QueryRow(code).Scan(&room.Id, &room.OwnerId, &room.Style, &room.Open, &room.JoinCode)
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

	if room.Open {
		room.JoinCode = utils.RandomWords()
	}

	err = stmt.QueryRow(room.OwnerId, room.Style, room.Open, room.JoinCode).Scan(&room.Id)
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
	if err != nil {
		return nil, err
	}
	return user, nil
}

func (room *RoomModel) GetCurrentGames(transaction *sql.Tx) ([]*GameModel, error) {
	var err error

	stmt, err := transaction.Prepare(database.GetRoomCurrentGame)
	if err != nil {
		return nil, err
	}

	rows, err := stmt.Query(room.Id)
	if err != nil {
		return nil, err
	}

	var ids []uint64 = make([]uint64, 0)
	for rows.Next() {
		var id uint64
		err = rows.Scan(&id)
		if err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}

	err = rows.Close()
	if err != nil {
		return nil, err
	}

	err = stmt.Close()
	if err != nil {
		return nil, err
	}

	var games []*GameModel = make([]*GameModel, len(ids))
	for index, id := range ids {
		games[index] = new(GameModel)
		err = games[index].FromId(transaction, id)
		if err != nil {
			return nil, err
		}
	}
	return games, nil
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
