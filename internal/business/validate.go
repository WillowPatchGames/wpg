package business

import (
	"database/sql"
	"errors"
	"log"
	"time"

	"gorm.io/gorm"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
)

func CanCreateGame(tx *gorm.DB, user database.User, room *database.Room, style string) (uint64, error) {
	var rows *sql.Rows
	var err error
	if room == nil {
		rows, err = tx.Model(&database.UserPlan{}).Where("user_plans.user_id = ? AND user_plans.active = ? AND user_plans.expires > ?", user.ID, true, time.Now()).Joins("LEFT JOIN plans ON user_plans.plan_id = plans.id").Where("plans.create_game = ?", true).Order("user_plans.price_cents ASC").Distinct().Rows()
		if err != nil {
			return 0, err
		}
	} else {
		rows, err = tx.Model(&database.UserPlan{}).Where("user_plans.user_id = ?", user.ID).Joins("LEFT JOIN user_plan_accountings ON user_plans.id = user_plan_accountings.user_plan_id").Where("user_plan_accountings.room_id = ?", room.ID).Order("user_plans.price_cents ASC").Distinct().Rows()
		if err != nil {
			log.Println("Error from room query")
			return 0, err
		}
		log.Println("no error from room query")
	}
	defer rows.Close()

	var candidateError error = errors.New("no plan associated with this account")

	for rows.Next() {
		if room != nil {
			log.Println("HERE! -- got a row!")
		}

		var user_plan database.UserPlan
		var plan *database.Plan

		if err := tx.ScanRows(rows, &user_plan); err != nil {
			candidateError = err
			log.Println("Error loading row!", err)
			continue
		}

		plan = GetPlan(tx, user_plan.PlanID)
		if plan == nil {
			log.Println("Error loading plan which doesn't exist!")
			continue
		}

		if !Matcher(plan.AvailableGameStyles, style) {
			log.Println("Didn't match game:", style, plan.AvailableGameStyles)
			continue
		}

		if room == nil {
			if plan.MaxTotalGames != database.PlanUnlimitedAllowed {
				var totalGames int64
				if err := tx.Model(&database.UserPlanAccounting{}).Where("user_plan_accountings.user_plan_id = ? AND user_plan_accountings.room_id = NULL AND user_plan_accountings.game_id != NULL", user.ID).Count(&totalGames).Error; err != nil {
					log.Println("Error loading total game count:", err)
					continue
				}

				if totalGames > int64(plan.MaxTotalGames) {
					candidateError = errors.New("unable to create new game because you have played too many games under this plan")
					continue
				}
			}

			if plan.MaxOpenGames != database.PlanUnlimitedAllowed {
				var openGames int64
				if err := tx.Model(&database.UserPlanAccounting{}).Where("user_plan_accountings.user_plan_id = ? AND user_plan_accountings.room_id = NULL AND user_plan_accountings.game_id != NULL", user.ID).Joins("LEFT JOIN games ON user_plan_accountings.game_id = games.id").Where("games.lifecycle = ?", "pending").Count(&openGames).Error; err != nil {
					log.Println("Error loading open game count:", err)
					continue
				}

				if openGames > int64(plan.MaxOpenGames) {
					candidateError = errors.New("unable to create new game because you have too many open games under this plan")
					continue
				}
			}

			if plan.MaxGamesInTimeframeCount != database.PlanUnlimitedAllowed {
				var since = time.Now().Add(-1 * plan.MaxGamesInTimeframeDuration)
				var gamesInDuration int64
				if err := tx.Model(&database.UserPlanAccounting{}).Where("user_plan_accountings.user_plan_id = ? AND user_plan_accountings.room_id = NULL AND user_plan_accountings.game_id != NULL AND created_at >= ?", user.ID, since).Count(&gamesInDuration).Error; err != nil {
					log.Println("Error loading game count in duration:", err)
					continue
				}

				if gamesInDuration > int64(plan.MaxGamesInTimeframeCount) {
					candidateError = errors.New("unable to create new game because you've played too many games recently under this plan")
					continue
				}
			}
		} else {
			if plan.MaxTotalGamesInRoom != database.PlanUnlimitedAllowed {
				var totalGamesInRoom int64
				if err := tx.Model(&database.UserPlanAccounting{}).Where("user_plan_accountings.user_plan_id = ? AND user_plan_accountings.room_id = ? AND user_plan_accountings.game_id != NULL", user.ID, room.ID).Count(&totalGamesInRoom).Error; err != nil {
					log.Println("Error loading game count in room in duration:", err)
					continue
				}

				if plan.MaxTotalGamesInRoom >= 0 && totalGamesInRoom > int64(plan.MaxTotalGamesInRoom) {
					candidateError = errors.New("unable to create new game because you have played too many games in this room")
					continue
				}
			}

			if plan.MaxOpenGamesInRoom != database.PlanUnlimitedAllowed {
				var openGamesInRoom int64
				if err := tx.Model(&database.UserPlanAccounting{}).Where("user_plan_accountings.user_plan_id = ? AND user_plan_accountings.room_id = ? AND user_plan_accountings.game_id != NULL", user.ID, room.ID).Joins("LEFT JOIN games ON user_plan_accountings.game_id = games.id").Where("games.lifecycle = ?", "pending").Count(&openGamesInRoom).Error; err != nil {
					log.Println("Error loading game count in room:", err)
					continue
				}

				if openGamesInRoom > int64(plan.MaxOpenGamesInRoom) {
					candidateError = errors.New("unable to create new game because you have too many open games in this room")
					continue
				}
			}
		}

		return user_plan.ID, nil
	}

	return 0, candidateError
}

func CanCreateRoom(tx *gorm.DB, user database.User) (uint64, error) {
	rows, err := tx.Model(&database.UserPlan{}).Where("user_plans.user_id = ? AND user_plans.active = ? AND user_plans.expires > ?", user.ID, true, time.Now()).Joins("LEFT JOIN plans ON user_plans.plan_id = plans.id").Where("plans.create_room = ?", true).Order("user_plans.price_cents ASC").Rows()
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	var candidateError error = errors.New("no plan associated with this account")

	for rows.Next() {
		var user_plan database.UserPlan
		var plan database.Plan

		if err := tx.ScanRows(rows, &user_plan); err != nil {
			candidateError = err
			log.Println("Error loading row!", err)
			continue
		}

		if err := tx.First(&plan, user_plan.PlanID).Error; err != nil {
			log.Println("Error loading plan by id!", err)
			continue
		}

		if plan.MaxOpenRooms != database.PlanUnlimitedAllowed {
			var openRooms int64
			if err := tx.Model(&database.Room{}).Where("owner_id = ? AND lifecycle = ?", user.ID, "pending").Count(&openRooms).Error; err != nil {
				log.Println("Error loading open rooms!", err)
				continue
			}

			if openRooms > int64(plan.MaxOpenRooms) {
				candidateError = errors.New("unable to create new room because you have too many open rooms under this plan")
				continue
			}
		}

		if plan.MaxTotalRooms != database.PlanUnlimitedAllowed {
			var totalRooms int64
			if err := tx.Model(&database.Room{}).Where("owner_id = ?", user.ID).Count(&totalRooms).Error; err != nil {
				log.Println("Error loading total rooms!", err)
				continue
			}

			if totalRooms > int64(plan.MaxTotalRooms) {
				candidateError = errors.New("unable to create new room because you have too many rooms under this plan")
				continue
			}
		}

		if plan.MaxRoomsInTimeframeCount != database.PlanUnlimitedAllowed {
			var since = time.Now().Add(-1 * plan.MaxRoomsInTimeframeDuration)
			var roomsInDuration int64
			if err := tx.Model(&database.Room{}).Where("owner_id = ? AND created_at >= ?", user.ID, since).Count(&roomsInDuration).Error; err != nil {
				candidateError = errors.New("unable to load room in duration")
				continue
			}

			if roomsInDuration > int64(plan.MaxRoomsInTimeframeCount) {
				candidateError = errors.New("unable to create new room because you've opened too many rooms recently")
				continue
			}
		}

		return user_plan.ID, nil
	}

	return 0, candidateError
}
