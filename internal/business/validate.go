package business

import (
	"errors"
	"time"

	"gorm.io/gorm"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
)

func CanCreateGame(tx *gorm.DB, user database.User, room *database.Room, style string) error {
	rows, err := tx.Model(&database.UserPlan{}).Where("user_plans.user_id = ? AND user_plans.active = ? AND user_plans.expires > ?", user.ID, true, time.Now()).Joins("LEFT JOIN plans ON user_plans.plan_id = plans.id").Where("plans.create_game = ?", true).Rows()
	if err != nil {
		return err
	}
	defer rows.Close()

	var candidateError error = errors.New("no plan associated with this account")

	for rows.Next() {
		var user_plan database.UserPlan
		var plan database.Plan

		if err := tx.ScanRows(rows, &user_plan); err != nil {
			candidateError = err
			continue
		}

		if err := tx.First(&plan, user_plan.PlanID).Error; err != nil {
			continue
		}

		if !MatchStyle(plan.AvailableGameStyles, style) {
			continue
		}

		if room == nil {
			var openGames int64
			if err := tx.Model(&database.Game{}).Where("owner_id = ? AND room_id = NULL AND lifecycle = ?", user.ID, "pending").Count(&openGames).Error; err != nil {
				continue
			}

			if plan.MaxOpenGames >= 0 && openGames > int64(plan.MaxOpenGames) {
				candidateError = errors.New("unable to create new game because you have too many open games under this plan")
				continue
			}

			var totalGames int64
			if err := tx.Model(&database.Game{}).Where("owner_id = ? AND room_id = NULL", user.ID).Count(&totalGames).Error; err != nil {
				continue
			}

			if plan.MaxTotalGames >= 0 && totalGames > int64(plan.MaxTotalGames) {
				candidateError = errors.New("unable to create new game because you have played too many games under this plan")
				continue
			}

			var since = time.Now().Add(-1 * plan.MaxGamesInTimeframeDuration)
			var gamesInDuration int64
			if err := tx.Model(&database.Game{}).Where("owner_id = ? AND room_id = NULL AND created >= ?", user.ID, since).Count(&gamesInDuration).Error; err != nil {
				continue
			}

			if plan.MaxGamesInTimeframeCount >= 0 && gamesInDuration > int64(plan.MaxGamesInTimeframeCount) {
				candidateError = errors.New("unable to create new game because you've played too many games recently under this plan")
				continue
			}
		} else {
			var openGamesInRoom int64
			if err := tx.Model(&database.Game{}).Where("owner_id = ? AND room_id = ? AND lifecycle = ?", user.ID, room.ID, "pending").Count(&openGamesInRoom).Error; err != nil {
				continue
			}

			if plan.MaxOpenGamesInRoom >= 0 && openGamesInRoom > int64(plan.MaxOpenGamesInRoom) {
				candidateError = errors.New("unable to create new game because you have too many open games in this room")
				continue
			}

			var totalGamesInRoom int64
			if err := tx.Model(&database.Game{}).Where("owner_id = ? AND room_id = ?", user.ID, room.ID).Count(&totalGamesInRoom).Error; err != nil {
				continue
			}

			if plan.MaxTotalGamesInRoom >= 0 && totalGamesInRoom > int64(plan.MaxTotalGamesInRoom) {
				candidateError = errors.New("unable to create new game because you have played too many games in this room")
				continue
			}
		}

		candidateError = nil
		break
	}

	return candidateError
}

func CanCreateRoom(tx *gorm.DB, user database.User) error {
	rows, err := tx.Model(&database.UserPlan{}).Where("user_plans.user_id = ? AND user_plans.active = ? AND user_plans.expires > ?", user.ID, true, time.Now()).Joins("LEFT JOIN plans ON user_plans.plan_id = plans.id").Where("plans.create_room = ?", true).Rows()
	if err != nil {
		return err
	}
	defer rows.Close()

	var candidateError error = errors.New("no plan associated with this account")

	for rows.Next() {
		var user_plan database.UserPlan
		var plan database.Plan

		if err := tx.ScanRows(rows, &user_plan); err != nil {
			candidateError = err
			continue
		}

		if err := tx.First(&plan, user_plan.PlanID).Error; err != nil {
			continue
		}

		var openRooms int64
		if err := tx.Model(&database.Room{}).Where("owner_id = ? AND lifecycle = ?", user.ID, "pending").Count(&openRooms).Error; err != nil {
			continue
		}

		if plan.MaxOpenRooms >= 0 && openRooms > int64(plan.MaxOpenRooms) {
			candidateError = errors.New("unable to create new room because you have too many open rooms under this plan")
			continue
		}

		var totalRooms int64
		if err := tx.Model(&database.Room{}).Where("owner_id = ?", user.ID).Count(&totalRooms).Error; err != nil {
			continue
		}

		if plan.MaxTotalRooms >= 0 && totalRooms > int64(plan.MaxTotalRooms) {
			candidateError = errors.New("unable to create new room because you have too many rooms under this plan")
			continue
		}

		var since = time.Now().Add(-1 * plan.MaxRoomsInTimeframeDuration)
		var roomsInDuration int64
		if err := tx.Model(&database.Room{}).Where("owner_id = ? AND created_at >= ?", user.ID, since).Count(&roomsInDuration).Error; err != nil {
			continue
		}

		if plan.MaxRoomsInTimeframeCount >= 0 && roomsInDuration > int64(plan.MaxRoomsInTimeframeCount) {
			candidateError = errors.New("unable to create new room because you've opened too many rooms recently")
			continue
		}

		candidateError = nil
		break
	}

	return candidateError
}
