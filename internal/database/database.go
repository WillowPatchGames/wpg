package database

import (
	"database/sql"

	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"gorm.io/gorm/logger"
)

// Database connection. Most
var db *gorm.DB

func OpenDatabase(format string, conn string, dry bool, logLevel string) error {
	var err error

	// To enable verbose query logging, import:
	//
	// and then add:
	//
	// to the config struct below.
	gorm_logger := logger.Default.LogMode(logger.Error)
	if logLevel == "silent" {
		gorm_logger = logger.Default.LogMode(logger.Silent)
	} else if logLevel == "warn" {
		gorm_logger = logger.Default.LogMode(logger.Warn)
	} else if logLevel == "info" {
		gorm_logger = logger.Default.LogMode(logger.Info)
	} else if logLevel != "error" && logLevel != "" {
		panic("Unknown log level: " + logLevel)
	}

	var config = gorm.Config{
		PrepareStmt: true,
		DryRun:      dry,
		Logger:      gorm_logger,
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

	return db.AutoMigrate(&User{}, &UserConfig{}, &Auth{}, &Room{}, &RoomMember{},
		&Game{}, &GamePlayer{}, &GameMessage{}, &Plan{}, &UserPlan{},
		&UserPlanAccounting{})
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
