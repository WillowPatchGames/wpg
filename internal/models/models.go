package models

import (
  "gorm.io/gorm"
)

type UserModel struct {
	gorm.Model
	ID       uint64
	Username sql.NullString
	Display  string
	Email    sql.NullString
	Guest    bool
	Created time.Time

	AuthTokens []AuthModel
  Rooms
}

type UserConfigModel struct {
	gorm.Model

	UserID   uint64
	User     UserModel

	GravatarHash sql.NullString
}

type AuthModel struct {
	gorm.Model

	UserID   uint64
	User UserModel

	APIToken string
}

type RoomModel struct {
	ID       uint64
	OwnerID  uint64
	Style    string
	Open     bool
	JoinCode string
}

type GameModel struct {
	ID        uint64
	OwnerID   uint64
	RoomID    sql.NullInt64

	Style     string
	Open      bool

	JoinCode  string
	Lifecycle string

  Config string
  State  string
}
