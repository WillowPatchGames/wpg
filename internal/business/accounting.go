package business

import (
	"gorm.io/gorm"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
)

func AccountToPlan(tx *gorm.DB, user_plan uint64, room_id uint64, game_id uint64) error {
	var details database.UserPlanAccounting
	details.UserPlanID = user_plan

	if room_id != 0 {
		details.RoomID.Valid = true
		details.RoomID.Int64 = int64(room_id)
	}

	if game_id != 0 {
		details.GameID.Valid = true
		details.GameID.Int64 = int64(game_id)
	}

	return tx.Create(&details).Error
}
