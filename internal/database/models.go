package database

import (
	"database/sql"
	"time"

	"gorm.io/gorm"
)

type User struct {
	gorm.Model
	ID       uint64
	Username sql.NullString
	Display  string
	Email    sql.NullString
	Guest    bool
	Created  time.Time

	AuthTokens []Auth
	Rooms      []Room `gorm:"foreignKey:OwnerID"`
	Games      []Game `gorm:"foreignKey:OwnerID"`
}

type UserConfig struct {
	gorm.Model

	UserID uint64
	User   User

	GravatarHash sql.NullString
}

type Auth struct {
	gorm.Model

	UserID uint64
	User   User

	APIToken string
}

type Room struct {
	ID       uint64
	OwnerID  uint64
	Style    string
	Open     bool
	JoinCode string

	Games []Game `gorm:"foreignKey:RoomID"`
}

type Game struct {
	ID      uint64
	OwnerID uint64
	RoomID  sql.NullInt64

	Style string
	Open  bool

	JoinCode  string
	Lifecycle string

	Config string
	State  string
}
