package user

import (
	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
)

type JSONUserConfig struct {
	GravatarHash         string `json:"gravatar,omitempty"`
	TurnPushNotification bool   `json:"turn_push_notification"`
	TurnHapticFeedback   bool   `json:"turn_haptic_feedback"`
}

func FromConfigModel(u database.UserConfig, includePrivate bool) *JSONUserConfig {
	var ret *JSONUserConfig = new(JSONUserConfig)
	have_field := false

	if u.GravatarHash.Valid {
		have_field = true
		ret.GravatarHash = u.GravatarHash.String
	}

	if u.TurnPushNotification.Valid {
		have_field = true
		ret.TurnPushNotification = u.TurnPushNotification.Bool
	}

	if u.TurnHapticFeedback.Valid {
		have_field = true
		ret.TurnHapticFeedback = u.TurnHapticFeedback.Bool
	}

	if !have_field {
		return nil
	}

	return ret
}
