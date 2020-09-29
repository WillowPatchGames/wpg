package database

import (
	"gorm.io/driver/sqlite"
  "gorm.io/driver/postgres"
	"gorm.io/gorm"
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
