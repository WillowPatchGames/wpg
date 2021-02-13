package business

import (
	"database/sql"

	"gorm.io/gorm"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
)

func expireOpenGames(tx *gorm.DB, user database.User, room *database.Room) error {
	var active_games []uint64
	var room_id sql.NullInt64

	if room == nil {
		room_id.Valid = false
	} else {
		room_id.Valid = true
		room_id.Int64 = int64(room.ID)
	}

	if err := tx.Model(&database.UserPlanAccounting{}).Where("user_plan_accountings.user_plan_id = ? AND user_plan_accountings.room_id = ? AND user_plan_accountings.game_id != NULL", user.ID, room_id).Joins("LEFT JOIN games ON user_plan_accountings.game_id = games.id").Where("games.lifecycle = ?", "pending").Select("games.id").Find(&active_games).Error; err != nil {
		return err
	}

	for _, game_id := range active_games {
		var game database.Game
		if err := tx.First(&game, game_id).Error; err != nil {
			return err
		}

		if err := game.HandleExpiration(tx); err != nil {
			return err
		}
	}

	return nil
}

func expireOpenRooms(tx *gorm.DB, user database.User) error {
	var active_rooms []uint64

	if err := tx.Model(&database.Room{}).Where("owner_id = ? AND lifecycle = ?", user.ID, "playing").Select("id").Find(&active_rooms).Error; err != nil {
		return err
	}

	for _, room_id := range active_rooms {
		var room database.Room
		if err := tx.First(&room, room_id).Error; err != nil {
			return err
		}

		if err := room.HandleExpiration(tx); err != nil {
			return err
		}
	}

	return nil
}
