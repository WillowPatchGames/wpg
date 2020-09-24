package games

import (
	"encoding/json"
	"errors"
)

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

func (c *Controller) dispatchRush(message []byte, header MessageHeader, data *GameData, player *PlayerData) error {
	var err error
	var state *RushState = data.State.(*RushState)
	if state == nil {
		panic("internal state is nil; this shouldn't happen when the game is started")
	}

	switch header.MessageType {
	case "start":
		// First count the number of people playing.
		var players int = 0
		for _, player := range data.ToPlayer {
			if player.Admitted {
				players += 1
			}
		}

		// Then start the underlying Rush game to populate game data.
		if err = state.Start(players); err != nil {
			return err
		}

		// Then assign indices to players who are playing and send out their
		// initial state data. Also notify all players that the game has started.
		var player_index int = 0
		for _, indexed_player := range data.ToPlayer {
			// Tell everyone interested that the game has started.
			var started ControllerNotifyStarted
			started.LoadFromController(data, indexed_player)
			c.undispatch(data, indexed_player, started.MessageID, 0, started)

			// Only assign indices to people who were admitted by the game admin.
			if indexed_player.Admitted {
				indexed_player.Index = player_index

				var response RushStateNotification
				response.LoadFromGame(state, player_index)
				response.LoadFromController(data, indexed_player)

				// Only reply to the original sender; the rest get a message but don't
				// get it as a reply.
				if indexed_player.UID == player.UID {
					response.ReplyTo = header.MessageID
				} else {
					response.ReplyTo = 0
				}

				// XXX: Handle 3 2 1 countdown.
				c.undispatch(data, indexed_player, response.MessageID, response.ReplyTo, response)

				player_index++
			}
		}
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
	case "check":
		err = state.IsValidBoard(player.Index)
	default:
		err = errors.New("unknown message_type issued to rush game: " + header.MessageType)
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

type GameIsWord struct {
	MessageHeader
	Word string `json:"word"`
}

func (c *Controller) dispatch(message []byte, header MessageHeader, game *GameData, player *PlayerData) error {
	// First try and handle some common message types. Note that since c.Dispatch
	// doesn't hold a lock, we can safely call back into c.MarkAdmitted(...) and
	// c.MarkReady(...).
	//
	// Note that start messages can't be handled here; they are specific to the
	// individual game type.
	switch header.MessageType {
	case "admit":
		var data GameAdmit
		if err := json.Unmarshal(message, &data); err != nil {
			return err
		}

		if player.UID != game.Owner {
			return errors.New("player not authorized to admit other players")
		}

		if err := c.markAdmitted(game.GID, data.Target, data.Admit); err != nil {
			return err
		}
	case "ready":
		var data GameReady
		if err := json.Unmarshal(message, &data); err != nil {
			return err
		}

		return c.markReady(game.GID, player.UID, data.Ready)
	case "word":
		var data GameIsWord
		if err := json.Unmarshal(message, &data); err != nil {
			return err
		}

		// XXX: Handle word check requests.
		return nil
	}

	if game.Mode != RushGame {
		panic("Valid but unsupported game mode: " + game.Mode.String())
	}

	return c.dispatchRush(message, header, game, player)
}
