package business

import (
	"errors"
	"io/ioutil"
	"log"
	"path/filepath"
	"time"

	"gorm.io/gorm"

	"gopkg.in/yaml.v2"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
)

type planCacheEntry struct {
	Plan    database.Plan
	Expires time.Time
}

func (entry *planCacheEntry) RefreshPlan(tx *gorm.DB) {
	if time.Now().After(entry.Expires) {
		if err := tx.First(&entry.Plan, "slug = ?", entry.Plan.Slug).Error; err != nil {
			log.Println("Unable to update plan (", entry.Plan.Slug, "):", err)
			return
		}

		entry.Expires = time.Now().Add(cacheExpiry * time.Second)
	}
}

var cacheExpiry time.Duration
var planCache map[uint64]*planCacheEntry = make(map[uint64]*planCacheEntry)
var planAssignments map[string][]uint64 = make(map[string][]uint64)

func LoadPlanConfig(tx *gorm.DB, path string) error {
	plan_data, err := ioutil.ReadFile(filepath.Clean(path))
	if err != nil {
		return err
	}

	var cfg planConfig
	if err := yaml.Unmarshal(plan_data, &cfg); err != nil {
		return err
	}

	// Since we loaded the config from YAML, deactivate all existing plans. This
	// ensures that any plans removed from the config will disappear.
	tx.Model(&database.Plan{}).Update("visible", false)

	cacheExpiry = cfg.CacheExpiry
	for _, plan := range cfg.Plans {
		var entry *planCacheEntry = new(planCacheEntry)
		var save bool = false
		var id uint64 = 0
		if err := tx.First(&entry.Plan, "slug = ?", plan.Slug).Error; err == nil {
			save = true
			id = entry.Plan.ID
		}

		entry.Plan = plan
		entry.Plan.ID = id
		if save {
			if err := tx.Save(&entry.Plan).Error; err != nil {
				return err
			}
		} else {
			if err := tx.Create(&entry.Plan).Error; err != nil {
				return err
			}
		}

		entry.Expires = time.Now().Add(cacheExpiry * time.Second)
		planCache[entry.Plan.ID] = entry
	}

	for email, plans := range cfg.Assignments {
		for _, plan := range plans {
			var id uint64
			for entry_id, entry := range planCache {
				if entry.Plan.Slug == plan {
					id = entry_id
					break
				}
			}

			if id == 0 {
				return errors.New("unable to assign to plan which doesn't exist: " + plan)
			}

			planAssignments[email] = append(planAssignments[email], id)
		}
	}

	return nil
}

func AddDefaultPlans(tx *gorm.DB, user database.User) error {
	for email, plans := range planAssignments {
		if Matcher(email, user.Email.String) {
			for _, plan := range plans {
				var entry = planCache[plan]
				entry.RefreshPlan(tx)

				log.Println("Got plan:", entry.Plan.ID)

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

func GetPlan(tx *gorm.DB, id uint64) *database.Plan {
	cache, present := planCache[id]
	if !present || cache == nil {
		return nil
	}

	if tx != nil {
		cache.RefreshPlan(tx)
	}

	return &cache.Plan
}
