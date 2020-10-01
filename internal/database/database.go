package database

import (
	"database/sql"

	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"

	"gorm.io/gorm"
)

// Database connection. Most
var db *gorm.DB

func OpenDatabase(format string, conn string, dry bool) error {
	var err error

	var config = gorm.Config{
		PrepareStmt: true,
		DryRun:      dry,
	}

	if format == "sqlite" {
		db, err = gorm.Open(sqlite.Open(conn), &config)
	} else if format == "postgres" {
		db, err = gorm.Open(postgres.Open(conn), &config)
	} else {
		panic("Unknown database type: " + format)
	}

	if err != nil {
		return err
	}

	return db.AutoMigrate(&User{}, &UserConfig{}, &Auth{}, &Room{}, &Game{})
}

func InTransaction(handler func(tx *gorm.DB) error, opts ...*sql.TxOptions) error {
	return db.Transaction(handler, opts...)
}
