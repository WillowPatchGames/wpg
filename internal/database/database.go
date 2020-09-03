package database

import (
	"database/sql"
	// Required for postgres database connection, the only type we currently
	// support. Ensures postgres dependency gets tracked in go.mod.
	_ "github.com/lib/pq"
)

// Database connection. Most
var db *sql.DB

func OpenDatabase(format string, conn string) error {
	var err error

	db, err = sql.Open(format, conn)
	if err != nil {
		return err
	}

	err = db.Ping()
	if err != nil {
		_ = db.Close()
		return err
	}

	return nil
}

func Close() error {
	return db.Close()
}

func GetTransaction() (*sql.Tx, error) {
	return db.Begin()
}
