package business

import (
	"time"

	"gorm.io/gorm"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
)

func AddDefaultPlans(tx *gorm.DB, user database.User) error {
	for email, plans := range PlanAssignments {
		if Matcher(email, user.Email.String) {
			for _, plan := range plans {
				var entry = PlanCache[plan]
				entry.RefreshPlan(tx)

				var db database.UserPlan
				db.UserID = user.ID
				db.PlanID = entry.Plan.ID
				db.Active = true
				db.PriceCents = 0
				db.BillingFrequency = 0
				db.Expires = time.Now().Add(100 * 365 * 24 * time.Hour)

				if err := tx.Create(&db).Error; err != nil {
					return err
				}
			}
		}
	}

	return nil
}
