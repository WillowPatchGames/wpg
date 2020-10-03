package business

import (
	"time"

	"gorm.io/gorm"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
)

const (
	CacheExpiration = 10 * time.Minute
)

type PlanCacheEntry struct {
	Plan    database.Plan
	Expires time.Time
}

var PlanCache map[uint64]PlanCacheEntry = make(map[uint64]PlanCacheEntry)

func AddPlans(tx *gorm.DB) error {
	// The only plan we'll add by default for now is the friends & family plan.
	//
	// XXX -- Make this configurable by a .ini file. Eventually the admin section
	// will export that and we'll be able to add it into our repo for easy test
	// deployments later.
	var entry PlanCacheEntry
	if err := tx.First(&entry.Plan, "slug = ?", "friends-and-family").Error; err != nil {
		// If the plan doesn't exist, we've gotta create it.
		entry.Plan.Slug = "friends-and-family"
		entry.Plan.Name = "Friends and Family"
		entry.Plan.Description = "The free, unlimited plan handed out by us at Willow Patch Games!"

		entry.Plan.MinPriceCents = 0
		entry.Plan.SuggestedPriceCents = 0
		entry.Plan.Billed = 0

		entry.Plan.CreateRoom = true
		entry.Plan.MaxOpenRooms = -1
		entry.Plan.MaxTotalRooms = -1
		entry.Plan.MaxGamesInRoom = -1
		entry.Plan.MaxPlayersInRoom = -1
		entry.Plan.MaxRoomsInTimeframeCount = -1
		entry.Plan.MaxRoomsInTimeframeDuration = 10 * 365 * 24 * time.Hour

		entry.Plan.CreateGame = true
		entry.Plan.MaxOpenGames = -1
		entry.Plan.MaxTotalGames = -1
		entry.Plan.MaxPlayersInGame = -1
		entry.Plan.MaxSpectatorsInGame = -1
		entry.Plan.MaxGamesInTimeframeCount = -1
		entry.Plan.MaxGamesInTimeframeDuration = 10 * 365 * 24 * time.Hour
		entry.Plan.AvailableGameStyles = "*"

		entry.Plan.CanAudioChat = true
		entry.Plan.CanVideoChat = true

		if err := tx.Create(&entry.Plan).Error; err != nil {
			return err
		}
	}

	entry.Expires = time.Now().Add(10 * 365 * 24 * time.Hour)
	PlanCache[entry.Plan.ID] = entry

	return nil
}
