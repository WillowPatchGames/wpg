package database

import (
	"strconv"
	"time"

	"gorm.io/gorm"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/utils"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/password"
)

func (user *User) getPassword(tx *gorm.DB) (string, error) {
	var auth Auth

	if err := tx.First(&auth, "user_id = ? AND category = ? AND key = ?", user.ID, "password", "current-password").Error; err != nil {
		return "", err
	}

	return auth.Value, nil
}

func (user *User) SetPassword(tx *gorm.DB, given string) error {
	if user.ID == 0 {
		panic("Unable to set password for NULL UserID")
	}

	var auth Auth
	var crypter *password.Scrypt = password.NewScrypt()

	err := crypter.Hash([]byte(given))
	if err != nil {
		return err
	}

	serialized, err := crypter.Marshal()
	if err != nil {
		return err
	}

	if err := tx.First(&auth, "user_id = ? AND category = ? AND key = ?", user.ID, "password", "current-password").Error; err == nil {
		var time = time.Now().Unix()
		var key = "old-password-" + strconv.FormatInt(time, 10)
		if err := tx.Model(&user).Update("key", key).Error; err != nil {
			return err
		}
	}

	auth.UserID = user.ID
	auth.Category = "password"
	auth.Key = "current-password"
	auth.Value = string(serialized)

	return tx.Create(&auth).Error
}

func (user *User) ComparePassword(tx *gorm.DB, given string) error {
	if user.ID == 0 {
		panic("Uninitialized user object passed to ComparePassword")
	}

	serialization, err := user.getPassword(tx)
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

func (user *User) FromPassword(tx *gorm.DB, auth *Auth, password string) error {
	if user.ID == 0 {
		panic("Unable to set password for NULL UserID")
	}

	if err := user.ComparePassword(tx, password); err != nil {
		return err
	}

	auth.UserID = user.ID
	auth.Category = "api-token"
	auth.Key = utils.RandomToken()
	auth.Value = "user"

	return tx.Create(&auth).Error
}

func (user *User) GuestToken(tx *gorm.DB, auth *Auth) error {
	if user.ID == 0 {
		panic("Unable to set password for NULL UserID")
	}

	auth.UserID = user.ID
	auth.Category = "api-token"
	auth.Key = utils.RandomToken()
	auth.Value = "guest"

	return tx.Create(&auth).Error
}

func (user *User) InvalidateGuestTokens(tx *gorm.DB) error {
	if user.ID == 0 {
		panic("Unable to set password for NULL UserID")
	}

	return tx.Table("auth as a").Where("user_id = ? AND value = ?", user.ID, "guest").Update("expires", time.Now()).Error
}
