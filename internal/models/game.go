package models

import (
	"database/sql"
	"encoding/json"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
	"git.cipherboy.com/WillowPatchGames/wpg/internal/utils"
)

type GameModel struct {
	ID        uint64
	OwnerID   uint64
	roomid    sql.NullInt64
	RoomID    uint64
	Style     string
	Open      bool
	JoinCode  string
	Lifecycle string
}

func (game *GameModel) FromID(transaction *sql.Tx, id uint64) error {
	stmt, err := transaction.Prepare(database.GetGameFromID)
	if err != nil {
		return err
	}

	err = stmt.QueryRow(id).Scan(&game.ID, &game.OwnerID, &game.roomid, &game.Style, &game.Open, &game.JoinCode, &game.Lifecycle)
	if err != nil {
		return err
	}

	if game.roomid.Valid {
		game.RoomID = uint64(game.roomid.Int64)
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

	err = stmt.QueryRow(code).Scan(&game.ID, &game.OwnerID, &game.roomid, &game.Style, &game.Open, &game.JoinCode, &game.Lifecycle)
	if err != nil {
		return err
	}

	if game.roomid.Valid {
		game.RoomID = uint64(game.roomid.Int64)
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

	if game.Open {
		game.JoinCode = utils.RandomWords()
	}

	game.Lifecycle = "pending"

	game.roomid.Valid = (game.RoomID != 0)
	game.roomid.Int64 = int64(game.RoomID)

	err = stmt.QueryRow(game.OwnerID, game.roomid, game.Style, game.Open, game.JoinCode).Scan(&game.ID)
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

	_, err = stmt.Exec(game.Style, game.Lifecycle, game.ID)
	if err != nil {
		return err
	}

	return stmt.Close()
}

func (game *GameModel) GetOwner(transaction *sql.Tx) (*UserModel, error) {
	var user *UserModel = new(UserModel)
	err := user.FromID(transaction, game.OwnerID)
	if err != nil {
		return nil, err
	}
	return user, nil
}

func (game *GameModel) GetRoom(transaction *sql.Tx) (*RoomModel, error) {
	if game.RoomID == 0 {
		return nil, nil
	}

	var room *RoomModel = new(RoomModel)
	err := room.FromID(transaction, game.RoomID)
	if err != nil {
		return nil, err
	}
	return room, nil
}

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
