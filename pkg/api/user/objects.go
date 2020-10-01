package user

import (
	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
)

type JSONUserConfig struct {
	GravatarHash string `json:"gravatar,omitempty"`
}

func FromConfigModel(u database.UserConfig, includePrivate bool) *JSONUserConfig {
	var ret *JSONUserConfig = nil

	if u.GravatarHash.Valid {
		ret = new(JSONUserConfig)
		ret.GravatarHash = u.GravatarHash.String
	}

	return ret
}
