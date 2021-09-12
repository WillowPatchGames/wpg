package database

import (
	"time"

	"gorm.io/gorm"
)

const DefaultRoomExpiration = 14 * 24 * time.Hour
const DefaultGameExpiration = 2 * 24 * time.Hour

func (r *Room) HandleExpiration(tx *gorm.DB) error {
	var dirty = false
	var expired = false

	if r.Lifecycle == "" {
		r.Lifecycle = "playing"
		dirty = true
	}

	if r.ExpiresAt.IsZero() {
		r.ExpiresAt = r.CreatedAt.Add(DefaultRoomExpiration)
		dirty = true
	}

	if r.ExpiresAt.Before(time.Now()) {
		if r.Lifecycle == "playing" {
			r.Lifecycle = "expired"
		}
		r.JoinCode.Valid = false
		r.JoinCode.String = ""
		dirty = true
		expired = true
	}

	if dirty {
		if !expired {
			return tx.Save(r).Error
		} else {
			if err := tx.Model(r).UpdateColumn("lifecycle", r.Lifecycle).Error; err != nil {
				return err
			}

			if err := tx.Model(r).UpdateColumn("join_code", r.JoinCode).Error; err != nil {
				return err
			}

			return tx.Model(r).UpdateColumn("expires_at", r.ExpiresAt).Error
		}
	}

	return nil
}

func (g *Game) HandleExpiration(tx *gorm.DB) error {
	var dirty = false
	var expired = false

	if g.ExpiresAt.IsZero() {
		g.ExpiresAt = g.CreatedAt.Add(DefaultGameExpiration)
		dirty = true
	}

	if g.ExpiresAt.Before(time.Now()) {
		if g.Lifecycle == "pending" || g.Lifecycle == "playing" {
			g.Lifecycle = "expired"
		}
		g.JoinCode.Valid = false
		g.JoinCode.String = ""
		dirty = true
		expired = true
	}

	if dirty {
		if !expired {
			return tx.Save(g).Error
		} else {
			if err := tx.Model(g).UpdateColumn("lifecycle", g.Lifecycle).Error; err != nil {
				return err
			}

			if err := tx.Model(g).UpdateColumn("join_code", g.JoinCode).Error; err != nil {
				return err
			}

			return tx.Model(g).UpdateColumn("expires_at", g.ExpiresAt).Error
		}
	}

	return nil
}

func ExpireTemporaryRoomCodes(tx *gorm.DB) error {
	return tx.Where("expires_at <= ?", time.Now()).Delete(TemporaryRoomCode{}).Error
}
