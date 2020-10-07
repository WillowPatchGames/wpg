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

	// To enable verbose query logging, import:
	//     "gorm.io/gorm/logger"
	// and then add:
	//     Logger:      logger.Default.LogMode(logger.Info),
	// to the config struct below.

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

	return db.AutoMigrate(&User{}, &UserConfig{}, &Auth{}, &Room{}, &Game{},
		&Plan{}, &UserPlan{}, &UserPlanAccounting{})
}

func InTransaction(handler func(tx *gorm.DB) error, opts ...*sql.TxOptions) error {
	return db.Transaction(handler, opts...)
}

func SetSQLFromString(dest *sql.NullString, src string) {
	if src == "" {
		dest.Valid = false
	} else {
		dest.Valid = true
		dest.String = src
	}
}

func SetStringFromSQL(dest *string, src sql.NullString) {
	if !src.Valid {
		*dest = ""
	} else {
		*dest = src.String
	}
}
