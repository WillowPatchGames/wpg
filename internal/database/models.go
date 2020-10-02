package database

import (
	"database/sql"
	"time"

	"gorm.io/gorm"
)

type User struct {
	gorm.Model
	ID       uint64
	Username sql.NullString `gorm:"unique"`
	Display  string
	Email    sql.NullString `gorm:"unique"`
	Guest    bool

	Created time.Time

	Config     UserConfig
	AuthTokens []Auth
	Rooms      []Room `gorm:"foreignKey:OwnerID"`
	Games      []Game `gorm:"foreignKey:OwnerID"`
}

type UserConfig struct {
	gorm.Model

	UserID uint64

	GravatarHash sql.NullString
}

type Auth struct {
	gorm.Model

	UserID   uint64 `gorm:"primaryKey"`
	User     User
	Category string
	Key      string `gorm:"primaryKey"`
	Value    string

	Created time.Time
	Expires time.Time
}

type Room struct {
	ID      uint64
	OwnerID uint64

	Style string
	Open  bool

	JoinCode  string `gorm:"unique"`
	Lifecycle string

	Config sql.NullString

	Games []Game `gorm:"foreignKey:RoomID"`
}

type Game struct {
	ID      uint64
	OwnerID uint64
	RoomID  sql.NullInt64

	Style string
	Open  bool

	JoinCode  string `gorm:"unique"`
	Lifecycle string

	Config sql.NullString
	State  sql.NullString
}
