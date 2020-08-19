package room

type RushRoomConfig struct {
	AllowSpectators bool   `json:"spectators"`
	GameMode        string `json:"mode"`
}
