package business

import (
	"errors"
	"time"

	"gorm.io/gorm"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
)

func CanCreateGame(tx *gorm.DB, user database.User, style string) error {
	rows, err := tx.Model(&database.UserPlan{}).Where("user_plans.user_id = ? AND user_plans.active = ? AND user_plans.expires > ?", user.ID, true, time.Now()).Joins("LEFT JOIN plans ON user_plans.plan_id = plans.id").Where("plans.create_game = ?", true).Rows()
	if err != nil {
		return err
	}
	defer rows.Close()

	var candidateError error

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

		var openGames int64
		if err := tx.Model(&database.Game{}).Where("owner_id = ? AND room_id = NULL AND lifecycle = ?", user.ID, "pending").Count(&openGames).Error; err != nil {
			continue
		}

		if plan.MaxOpenGames >= 0 && openGames > int64(plan.MaxOpenGames) {
			candidateError = errors.New("unable to create new game because you have too many open games under this plan")
			continue
		}

		var since = time.Now().Add(-1 * plan.MaxGamesInTimeframeDuration)
		var openInDuration int64
		if err := tx.Model(&database.Game{}).Where("owner_id = ? AND room_id = NULL AND created >= ?", user.ID, since).Count(&openInDuration).Error; err != nil {
			continue
		}

		if plan.MaxGamesInTimeframeCount >= 0 && openInDuration > int64(plan.MaxGamesInTimeframeCount) {
			candidateError = errors.New("unable to create new game because you've played too many games recently")
			continue
		}

		candidateError = nil
		break
	}

	return candidateError
}
