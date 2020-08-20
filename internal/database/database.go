package database

import (
	"database/sql"
	_ "github.com/lib/pq"
)

var DB *sql.DB

func OpenDatabase(format string, conn string) error {
	var err error

	DB, err = sql.Open(format, conn)
	if err != nil {
		return err
	}

	err = DB.Ping()
	if err != nil {
		_ = DB.Close()
		return err
	}

	return nil
}

func GetTransaction() (*sql.Tx, error) {
	return DB.Begin()
}
