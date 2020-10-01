package database

import (
	"database/sql"
	"time"

	"gorm.io/gorm"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/utils"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/password"
)

type User struct {
	gorm.Model
	ID       uint64
	Username sql.NullString `gorm:"unique"`
	Display  string
	Email    sql.NullString `gorm:"unique"`
	Guest    bool
	Created  time.Time

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

	UserID   uint64
	User     User
	Category string
	Key      string `gorm:"unique"`
	Value    string

	APIToken string
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

	Config string
	State  string
}

func getPassword(tx *gorm.DB, user *User) (string, error) {
	var auth Auth

	if err := tx.First(&auth, "id = ? AND category = ? AND key = ?", user.ID, "password", "current-password").Error; err != nil {
		return "", err
	}

	return auth.Value, nil
}

func ComparePassword(tx *gorm.DB, user *User, given string) error {
	if user.ID == 0 {
		panic("Uninitialized user object passed to ComparePassword")
	}

	serialization, err := getPassword(tx, user)
	if err != nil {
		return err
	}

	var crypter *password.Scrypt = password.NewScrypt()

	err = crypter.Unmarshal([]byte(serialization))
	if err != nil {
		return err
	}

	return crypter.Compare([]byte(given))
}

func FromPassword(tx *gorm.DB, user *User, auth *Auth, password string) error {
	if err := ComparePassword(tx, user, password); err != nil {
		return err
	}

	auth.Category = "api-token"
	auth.Key = utils.RandomToken()
	auth.Value = "full"

	tx.Create(&auth)

	return nil
}
