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

const (
	PlanNotAllowed       int = 0
	PlanUnlimitedAllowed int = -1
)

type Plan struct {
	gorm.Model

	ID          uint64
	Slug        string `gorm:"unique" yaml:"slug"`
	Name        string `yaml:"name"`
	Description string `yaml:"description"`
	Open        bool   `yaml:"open"`

	MinPriceCents       uint          `yaml:"min_price_cents"`
	SuggestedPriceCents uint          `yaml:"suggested_price_cents"`
	MaxPriceCents       uint          `yaml:"max_price_cents"`
	BillingFrequency    time.Duration `yaml:"billed"`

	CreateRoom                  bool          `yaml:"create_room"`
	MaxOpenRooms                int           `yaml:"max_open_rooms"`
	MaxTotalRooms               int           `yaml:"max_total_rooms"`
	MaxOpenGamesInRoom          int           `yaml:"max_open_games_in_room"`
	MaxTotalGamesInRoom         int           `yaml:"max_total_games_in_room"`
	MaxPlayersInRoom            int           `yaml:"max_players_in_room"`
	MaxRoomsInTimeframeCount    int           `yaml:"max_rooms_in_timeframe_count"`
	MaxRoomsInTimeframeDuration time.Duration `yaml:"max_rooms_in_timeframe_duration"`

	CreateGame                  bool          `yaml:"create_game"`
	MaxOpenGames                int           `yaml:"max_open_games"`
	MaxTotalGames               int           `yaml:"max_total_games"`
	MaxPlayersInGame            int           `yaml:"max_players_in_game"`
	MaxSpectatorsInGame         int           `yaml:"max_spectators_in_game"`
	MaxGamesInTimeframeCount    int           `yaml:"max_games_in_timeframe_count"`
	MaxGamesInTimeframeDuration time.Duration `yaml:"max_games_in_timeframe_duration"`

	AvailableGameStyles string `yaml:"available_game_styles"`

	CanAudioChat bool `yaml:"can_audio_chat"`
	CanVideoChat bool `yaml:"can_video_chat"`
}

type UserPlan struct {
	gorm.Model

	ID uint64

	UserID uint64
	User   User

	PlanID uint64
	Plan   Plan

	Active bool

	PriceCents       uint
	BillingFrequency time.Duration

	Expires time.Time
}

type UserPlanAccounting struct {
	gorm.Model

	UserPlanID uint64
	UserPlan   UserPlan

	RoomID sql.NullInt64
	Room   Room

	GameID sql.NullInt64
	Game   Game
}
