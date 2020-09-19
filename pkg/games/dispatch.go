package games

import (
	"encoding/json"
	"errors"
)

type RushCheckBoard struct {
	MessageHeader
}

type RushDraw struct {
	MessageHeader
	DrawID int `json:"draw_id"`
}

type RushDiscard struct {
	MessageHeader
	TileID int `json:"tile_id"`
}

type RushRecall struct {
	MessageHeader
	TileID int `json:"tile_id"`
}

type RushSwap struct {
	MessageHeader
	FirstID  int `json:"first_id"`
	SecondID int `json:"second_id"`
}

type RushMove struct {
	MessageHeader
	TileID int `json:"tile_id"`
	X      int `json:"x"`
	Y      int `json:"y"`
}

type RushPlay struct {
	MessageHeader
	TileID int `json:"tile_id"`
	X      int `json:"x"`
	Y      int `json:"y"`
}

func (c *Controller) dispatchRush(message []byte, data GameData, messageType string, player PlayerData) error {
	var err error
	var state *RushState = data.State.(*RushState)
	if state == nil {
		panic("internal state is nil; this shouldn't happen when the game is started")
	}

	switch messageType {
	case "start":
		var players int = 0
		for _, player := range data.ToPlayer {
			if player.Admitted {
				players += 1
			}
		}

		err = state.Start(players)
	case "play":
		var data RushPlay
		if err := json.Unmarshal(message, &data); err != nil {
			return err
		}

		if data.TileID == 0 {
			return errors.New("unknown tile identifier")
		}

		err = state.PlayTile(player.Index, data.TileID, data.X, data.Y)
	case "move":
		var data RushMove
		if err := json.Unmarshal(message, &data); err != nil {
			return err
		}

		if data.TileID == 0 {
			return errors.New("unknown tile identifier")
		}

		err = state.MoveTile(player.Index, data.TileID, data.X, data.Y)
	case "swap":
		var data RushSwap
		if err := json.Unmarshal(message, &data); err != nil {
			return err
		}

		if data.FirstID == 0 || data.SecondID == 0 {
			return errors.New("unknown tile identifier")
		}

		err = state.SwapTile(player.Index, data.FirstID, data.SecondID)
	case "recall":
		var data RushRecall
		if err := json.Unmarshal(message, &data); err != nil {
			return err
		}

		if data.TileID == 0 {
			return errors.New("unknown tile identifier")
		}

		err = state.RecallTile(player.Index, data.TileID)
	case "discard":
		var data RushDiscard
		if err := json.Unmarshal(message, &data); err != nil {
			return err
		}

		if data.TileID == 0 {
			return errors.New("unknown tile identifier")
		}

		err = state.Discard(player.Index, data.TileID)
	case "draw":
		var data RushDraw
		if err := json.Unmarshal(message, &data); err != nil {
			return err
		}

		if data.DrawID == 0 {
			return errors.New("unknown draw identifier")
		}

		err = state.Draw(player.Index, data.DrawID)
	default:
		err = errors.New("unknown message_type issued to rush game: " + messageType)
	}

	return err
}

type GameAdmit struct {
	MessageHeader
	Target uint64 `json:"target_id"`
	Admit  bool   `json:"admit"`
}

type GameReady struct {
	MessageHeader
	Ready bool `json:"ready"`
}

func (c *Controller) dispatch(message []byte, game GameData, messageType string, player PlayerData) error {
	// First try and handle some common message types. Note that since c.Dispatch
	// doesn't hold a lock, we can safely call back into c.MarkAdmitted(...) and
	// c.MarkReady(...).
	//
	// Note that start messages can't be handled here; they are specific to the
	// individual game type.
	switch messageType {
	case "admit":
		var data GameAdmit
		if err := json.Unmarshal(message, &data); err != nil {
			return err
		}

		return c.MarkAdmitted(game.GID, data.Target, data.Admit)
	case "ready":
		var data GameReady
		if err := json.Unmarshal(message, &data); err != nil {
			return err
		}

		return c.MarkReady(game.GID, player.UID, data.Ready)
	}

	if game.Mode != RushGame {
		panic("Valid but unsupported game mode: " + game.Mode.String())
	}

	return c.dispatchRush(message, game, messageType, player)
}
