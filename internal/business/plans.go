package business

import (
	"errors"
	"io/ioutil"
	"path/filepath"
	"strings"
	"time"

	"gorm.io/gorm"

	"gopkg.in/yaml.v2"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
)

const (
	CacheExpiration = 10 * time.Minute
)

type PlanCacheEntry struct {
	Plan    database.Plan
	Expires time.Time
}

type planConfig struct {
	CacheExpiry time.Duration       `yaml:"cache_expiry"`
	Plans       []database.Plan     `yaml:"plans"`
	Assignments map[string][]string `yaml:"assignments"`
}

var PlanCache map[uint64]PlanCacheEntry = make(map[uint64]PlanCacheEntry)
var PlanAssignments map[string][]uint64 = make(map[string][]uint64)

func LoadPlanConfig(tx *gorm.DB, path string) error {
	plan_data, err := ioutil.ReadFile(filepath.Clean(path))
	if err != nil {
		return err
	}

	var cfg planConfig
	if err := yaml.Unmarshal(plan_data, &cfg); err != nil {
		return err
	}

	for _, plan := range cfg.Plans {
		var entry PlanCacheEntry
		var save bool = false
		var id uint64 = 0
		if err := tx.First(&entry.Plan, "slug = ?", plan.Slug).Error; err != nil {
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

		entry.Expires = time.Now().Add(cfg.CacheExpiry * time.Second)
		PlanCache[entry.Plan.ID] = entry
	}

	for email, plans := range cfg.Assignments {
		for _, plan := range plans {
			var id uint64
			for entry_id, entry := range PlanCache {
				if entry.Plan.Slug == plan {
					id = entry_id
					break
				}
			}

			if id == 0 {
				return errors.New("unable to assign to plan which doesn't exist: " + plan)
			}

			PlanAssignments[email] = append(PlanAssignments[email], id)
		}
	}

	return nil
}

func MatchStyle(available string, given string) bool {
	var parts []string = strings.Split(available, ",")
	for _, part := range parts {
		if part == "*" {
			return true
		}

		if part == given {
			return true
		}
	}

	return false
}
