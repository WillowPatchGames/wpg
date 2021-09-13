package user

import (
	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
)

type JSONUserConfig struct {
	GravatarHash          string `json:"gravatar,omitempty"`
	TurnPushNotification  bool   `json:"turn_push_notification"`
	TurnSoundNotification bool   `json:"turn_sound_notification"`
	TurnHapticFeedback    bool   `json:"turn_haptic_feedback"`
	AutoReady             bool   `json:"auto_ready"`
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

	if u.TurnSoundNotification.Valid {
		have_field = true
		ret.TurnSoundNotification = u.TurnSoundNotification.Bool
	}

	if u.TurnHapticFeedback.Valid {
		have_field = true
		ret.TurnHapticFeedback = u.TurnHapticFeedback.Bool
	}

	if u.AutoReady.Valid {
		have_field = true
		ret.AutoReady = u.AutoReady.Bool
	}

	if !have_field {
		return nil
	}

	return ret
}
