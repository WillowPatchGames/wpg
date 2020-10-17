package database

import (
	"database/sql"
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID uint64 `gorm:"primaryKey"`

	Username sql.NullString `gorm:"unique"`
	Display  string
	Email    sql.NullString `gorm:"unique"`
	Guest    bool

	Created time.Time

	Config     UserConfig
	AuthTokens []Auth
	Rooms      []Room `gorm:"foreignKey:OwnerID"`
	Games      []Game `gorm:"foreignKey:OwnerID"`

	CreatedAt time.Time      `gorm:"autoCreateTime"`
	UpdatedAt time.Time      `gorm:"autoUpdateTime"`
	DeletedAt gorm.DeletedAt `gorm:"index"`
}

type UserConfig struct {
	ID uint64 `gorm:"primaryKey"`

	UserID uint64

	GravatarHash sql.NullString

	CreatedAt time.Time      `gorm:"autoCreateTime"`
	UpdatedAt time.Time      `gorm:"autoUpdateTime"`
	DeletedAt gorm.DeletedAt `gorm:"index"`
}

type Auth struct {
	ID uint64 `gorm:"primaryKey"`

	UserID   uint64 `gorm:"unique_index:user_key_unique"`
	User     User
	Category string
	Key      string `gorm:"unique_index:user_key_unique"`
	Value    string

	Expires time.Time

	CreatedAt time.Time      `gorm:"autoCreateTime"`
	UpdatedAt time.Time      `gorm:"autoUpdateTime"`
	DeletedAt gorm.DeletedAt `gorm:"index"`
}

type Room struct {
	ID      uint64 `gorm:"primaryKey"`
	OwnerID uint64

	Style string
	Open  bool

	JoinCode sql.NullString `gorm:"unique"`

	Config sql.NullString

	Games []Game `gorm:"foreignKey:RoomID"`

	CreatedAt time.Time      `gorm:"autoCreateTime"`
	UpdatedAt time.Time      `gorm:"autoUpdateTime"`
	DeletedAt gorm.DeletedAt `gorm:"index"`
}

type RoomMember struct {
	UserID sql.NullInt64 `gorm:"primaryKey;autoIncrement:false;unique_index:user_room_unique"`
	User   User

	RoomID uint64 `gorm:"primaryKey;autoIncrement:false;unique_index:user_room_unique"`
	Room   Room

	Admitted bool
	JoinCode sql.NullString `gorm:"unique"`
	Banned   bool

	CreatedAt time.Time      `gorm:"autoCreateTime"`
	UpdatedAt time.Time      `gorm:"autoUpdateTime"`
	DeletedAt gorm.DeletedAt `gorm:"index"`
}

type Game struct {
	ID      uint64 `gorm:"primaryKey"`
	OwnerID uint64
	RoomID  sql.NullInt64

	Style string
	Open  bool

	JoinCode  sql.NullString `gorm:"unique"`
	Lifecycle string

	Config sql.NullString
	State  sql.NullString

	CreatedAt time.Time      `gorm:"autoCreateTime"`
	UpdatedAt time.Time      `gorm:"autoUpdateTime"`
	DeletedAt gorm.DeletedAt `gorm:"index"`
}

type GamePlayer struct {
	UserID sql.NullInt64 `gorm:"primaryKey;autoIncrement:false;unique_index:user_game_unique"`
	User   User

	GameID uint64 `gorm:"primaryKey;autoIncrement:false;unique_index:user_game_unique"`
	Game   Game

	Admitted bool
	JoinCode sql.NullString `gorm:"unique"`
	Banned   bool

	CreatedAt time.Time      `gorm:"autoCreateTime"`
	UpdatedAt time.Time      `gorm:"autoUpdateTime"`
	DeletedAt gorm.DeletedAt `gorm:"index"`
}

type GameMessage struct {
	ID uint64 `gorm:"primaryKey"`

	UserID    uint64
	GameID    uint64
	Timestamp time.Time
	Message   string

	CreatedAt time.Time      `gorm:"autoCreateTime"`
	UpdatedAt time.Time      `gorm:"autoUpdateTime"`
	DeletedAt gorm.DeletedAt `gorm:"index"`
}

const (
	PlanNotAllowed       int = 0
	PlanUnlimitedAllowed int = -1
)

type Plan struct {
	ID          uint64 `gorm:"primaryKey" json:"id"`
	Slug        string `gorm:"unique" json:"slug" yaml:"slug"`
	Name        string `json:"name" yaml:"name"`
	Description string `json:"description" yaml:"description"`
	Open        bool   `json:"open" yaml:"open"`
	Visible     bool   `json:"visible" yaml:"visible"`

	MinPriceCents       uint          `json:"min_price_cents" yaml:"min_price_cents"`
	SuggestedPriceCents uint          `json:"suggested_price_cents" yaml:"suggested_price_cents"`
	MaxPriceCents       uint          `json:"max_price_cents" yaml:"max_price_cents"`
	BillingFrequency    time.Duration `json:"billed" yaml:"billed"`

	CreateRoom                  bool          `json:"create_room" yaml:"create_room"`
	MaxOpenRooms                int           `json:"max_open_rooms" yaml:"max_open_rooms"`
	MaxTotalRooms               int           `json:"max_total_rooms" yaml:"max_total_rooms"`
	MaxOpenGamesInRoom          int           `json:"max_open_games_in_room" yaml:"max_open_games_in_room"`
	MaxTotalGamesInRoom         int           `json:"max_total_games_in_room" yaml:"max_total_games_in_room"`
	MaxPlayersInRoom            int           `json:"max_players_in_room" yaml:"max_players_in_room"`
	MaxRoomsInTimeframeCount    int           `json:"max_rooms_in_timeframe_count" yaml:"max_rooms_in_timeframe_count"`
	MaxRoomsInTimeframeDuration time.Duration `json:"max_rooms_in_timeframe_duration" yaml:"max_rooms_in_timeframe_duration"`

	CreateGame                  bool          `json:"create_game" yaml:"create_game"`
	MaxOpenGames                int           `json:"max_open_games" yaml:"max_open_games"`
	MaxTotalGames               int           `json:"max_total_games" yaml:"max_total_games"`
	MaxPlayersInGame            int           `json:"max_players_in_game" yaml:"max_players_in_game"`
	MaxSpectatorsInGame         int           `json:"max_spectators_in_game" yaml:"max_spectators_in_game"`
	MaxGamesInTimeframeCount    int           `json:"max_games_in_timeframe_count" yaml:"max_games_in_timeframe_count"`
	MaxGamesInTimeframeDuration time.Duration `json:"max_games_in_timeframe_duration" yaml:"max_games_in_timeframe_duration"`

	AvailableGameStyles string `json:"available_game_styles" yaml:"available_game_styles"`

	CanAudioChat bool `json:"can_audio_chat" yaml:"can_audio_chat"`
	CanVideoChat bool `json:"can_video_chat" yaml:"can_video_chat"`

	CreatedAt time.Time      `gorm:"autoCreateTime"`
	UpdatedAt time.Time      `gorm:"autoUpdateTime"`
	DeletedAt gorm.DeletedAt `gorm:"index"`
}

type UserPlan struct {
	ID uint64 `gorm:"primaryKey"`

	UserID uint64
	User   User

	PlanID uint64
	Plan   Plan

	Active bool

	StripePending    bool
	PriceCents       uint
	BillingFrequency time.Duration
	StripeSessionID  string
	LastBilled       time.Time

	Expires time.Time

	CreatedAt time.Time      `gorm:"autoCreateTime"`
	UpdatedAt time.Time      `gorm:"autoUpdateTime"`
	DeletedAt gorm.DeletedAt `gorm:"index"`
}

type UserPlanAccounting struct {
	ID uint64 `gorm:"primaryKey"`

	UserPlanID uint64
	UserPlan   UserPlan

	RoomID sql.NullInt64
	Room   Room `gorm:"foreignKey:RoomID"`

	GameID sql.NullInt64
	Game   Game `gorm:"foreignKey:GameID"`

	CreatedAt time.Time      `gorm:"autoCreateTime"`
	UpdatedAt time.Time      `gorm:"autoUpdateTime"`
	DeletedAt gorm.DeletedAt `gorm:"index"`
}
