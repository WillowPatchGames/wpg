package game

type RushGameConfig struct {
	AllowSpectators bool `json:"spectators"`
	NumTiles        int  `json:"num_tiles"`
	StartSize       int  `json:"start_size"`
	DrawSize        int  `json:"draw_size"`
	DiscardPenalty  int  `json:"discard_penalty"`
	NumPlayers      int  `json:"num_players"`
	TilesPerPlayer  bool `json:"tiles_per_player"`
}
