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
	gorm.Model

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
	gorm.Model

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

type Plan struct {
	gorm.Model

	ID          uint64
	Name        string
	Description string
	Open        bool

	MinPriceCents       uint
	SuggestedPriceCents uint
	Billed              time.Duration

	CreateRoom                  bool
	MaxOpenRooms                int
	MaxTotalRooms               int
	MaxGamesInRoom              int
	MaxPlayersInRoom            int
	MaxRoomsInTimeframeCount    int
	MaxRoomsInTimeframeDuration time.Duration

	CreateGame                  bool
	MaxOpenGames                int
	MaxTotalGames               int
	MaxPlayersInGame            int
	MaxSpectatorsInGame         int
	MaxGamesInTimeframeCount    int
	MaxGamesInTimeframeDuration time.Duration
	AvailableGameStyles         string

	CanAudioChat bool
	CanVideoChat bool
}

type UserPlan struct {
	gorm.Model

	UserID uint64
	User   User

	PlanID uint64
	Plan   Plan

	Active bool

	PriceCents uint
	Billed     time.Duration

	Created time.Time
	Expires time.Time
}
