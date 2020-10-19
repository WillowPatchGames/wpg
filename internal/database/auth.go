package database

import (
	"errors"
	"strconv"
	"strings"
	"time"

	"gorm.io/gorm"

	"github.com/pquerna/otp/totp"

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
		if err := tx.Model(&auth).Update("key", key).Error; err != nil {
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

	var have_2fa = true
	var auth2fa Auth
	if err := tx.Model(&Auth{}).Where("user_id = ? AND category = ? AND key LIKE ?", user.ID, "totp-secret", "%-key").First(&auth2fa).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}

		have_2fa = false
	}

	auth.UserID = user.ID
	if have_2fa {
		auth.Category = "temporary-api-token-need-2fa"
	} else {
		auth.Category = "api-token"
	}
	auth.Key = utils.RandomToken()
	auth.Value = "user"

	return tx.Create(auth).Error
}

func (user *User) FinishAuth(tx *gorm.DB, auth *Auth, token string, code string) error {
	if user.ID == 0 {
		panic("Unable to set password for NULL UserID")
	}

	if err := tx.First(auth, "user_id = ? AND category = ? AND key = ?", user.ID, "temporary-api-token-need-2fa", token).Error; err != nil {
		return err
	}

	devices, err := user.GetTOTPDevices(tx)
	if err != nil {
		return err
	}

	var candidateError error = nil
	for _, device := range devices {
		// Skip 2FA tokens pending validation.
		if !strings.HasSuffix(device, "-key") {
			continue
		}

		secret, err := user.GetTOTPKey(tx, strings.TrimSuffix(device, "-key"), false)
		if err != nil {
			candidateError = err
			continue
		}

		if totp.Validate(code, secret) {
			candidateError = nil
			break
		}

		candidateError = errors.New("wrong 2FA code; make sure your time is synchronized and try again")
	}

	if candidateError != nil {
		return candidateError
	}

	auth.Category = "api-token"
	return tx.Save(auth).Error
}

func (user *User) GuestToken(tx *gorm.DB, auth *Auth) error {
	if user.ID == 0 {
		panic("Unable to set password for NULL UserID")
	}

	auth.UserID = user.ID
	auth.Category = "api-token"
	auth.Key = utils.RandomToken()
	auth.Value = "guest"

	return tx.Create(auth).Error
}

func (user *User) InvalidateGuestTokens(tx *gorm.DB) error {
	if user.ID == 0 {
		panic("Unable to set password for NULL UserID")
	}

	return tx.Model(&Auth{}).Where("user_id = ? AND value = ?", user.ID, "guest").Update("expires", time.Now()).Error
}

func (user *User) SetTOTPKey(tx *gorm.DB, device string, secret string, pending bool) error {
	if user.ID == 0 {
		panic("Unable to set TOTP key for NULL UserID")
	}

	var auth Auth

	auth.UserID = user.ID
	auth.Category = "totp-secret"
	auth.Key = device + "-key"
	if pending {
		auth.Key += "-pending"
	}
	auth.Value = secret

	return tx.Create(&auth).Error
}

func (user *User) GetTOTPKey(tx *gorm.DB, device string, pending bool) (string, error) {
	if user.ID == 0 {
		panic("Unable to get TOTP key for NULL UserID")
	}

	var auth Auth
	var key = device + "-key"
	if pending {
		key += "-pending"
	}

	err := tx.First(&auth, "category = ? AND key = ? AND user_id = ?", "totp-secret", key, user.ID).Error
	if err != nil {
		return "", err
	}

	return auth.Value, nil
}

func (user *User) MarkTOTPVerified(tx *gorm.DB, device string, secret string) error {
	if user.ID == 0 {
		panic("Unable to get TOTP key for NULL UserID")
	}

	var auth Auth
	var key = device + "-key-pending"

	err := tx.First(&auth, "category = ? AND key = ? AND user_id = ?", "totp-secret", key, user.ID).Error
	if err != nil {
		return err
	}

	auth.Key = device + "-key"
	auth.Value = secret

	return tx.Save(&auth).Error
}

func (user *User) GetTOTPDevices(tx *gorm.DB) ([]string, error) {
	var devices []string

	if err := tx.Model(&Auth{}).Where("user_id = ? AND category = ?", user.ID, "totp-secret").Select("key").Find(&devices).Error; err != nil {
		return nil, err
	}

	return devices, nil
}

func (user *User) RemoveTOTP(tx *gorm.DB, device string) error {
	if user.ID == 0 {
		panic("Unable to get TOTP key for NULL UserID")
	}

	var auth Auth
	var key = device + "-key"

	err := tx.First(&auth, "category = ? AND key = ? AND user_id = ?", "totp-secret", key, user.ID).Error
	if err != nil {
		key += "-pending"
		err = tx.First(&auth, "category = ? AND key = ? AND user_id = ?", "totp-secret", key, user.ID).Error
	}

	if err == nil {
		err = tx.Delete(&auth).Error
	}

	return err
}
