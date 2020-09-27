package games

import (
	"encoding/json"
	"errors"
	"log"
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

func (c *Controller) dispatchRush(message []byte, header MessageHeader, game *GameData, player *PlayerData) error {
	var err error
	var state *RushState = game.State.(*RushState)
	if state == nil {
		panic("internal state is nil; this shouldn't happen when the game is started")
	}

	var was_finished = state.Finished

	switch header.MessageType {
	case "start":
		var players int = 0
		for _, player := range game.ToPlayer {
			if player.Playing {
				players += 1
			}
		}

		state.Config.NumPlayers = players
		if err = state.Config.Validate(); err != nil {
			return err
		}

		return c.handleCountdown(game)
	case "join":
		log.Println("Handling join message -- ", state.Started, state.Finished)
		if state.Started && !state.Finished {
			var started ControllerNotifyStarted
			started.LoadFromController(game, player)
			started.ReplyTo = header.MessageID
			c.undispatch(game, player, started.MessageID, started.ReplyTo, started)

			if player.Playing && player.Index >= 0 {
				var response RushStateNotification
				response.LoadFromGame(state, player.Index)
				response.LoadFromController(game, player)

				c.undispatch(game, player, response.MessageID, 0, response)
			}
		} else if state.Finished {
			var winner uint64 = 0
			for _, indexed_player := range game.ToPlayer {
				if state.Winner == indexed_player.Index {
					winner = indexed_player.UID
					break
				}
			}

			var finished RushFinishedNotification
			finished.LoadFromController(game, player, winner)
			finished.ReplyTo = header.MessageID
			c.undispatch(game, player, finished.MessageID, finished.ReplyTo, finished)
		}
	case "play":
		var data RushPlay
		if err = json.Unmarshal(message, &data); err != nil {
			return err
		}

		if data.TileID == 0 {
			return errors.New("unknown tile identifier")
		}

		err = state.PlayTile(player.Index, data.TileID, data.X, data.Y)
	case "move":
		var data RushMove
		if err = json.Unmarshal(message, &data); err != nil {
			return err
		}

		if data.TileID == 0 {
			return errors.New("unknown tile identifier")
		}

		err = state.MoveTile(player.Index, data.TileID, data.X, data.Y)
	case "swap":
		var data RushSwap
		if err = json.Unmarshal(message, &data); err != nil {
			return err
		}

		if data.FirstID == 0 || data.SecondID == 0 {
			return errors.New("unknown tile identifier")
		}

		err = state.SwapTile(player.Index, data.FirstID, data.SecondID)
	case "recall":
		var data RushRecall
		if err = json.Unmarshal(message, &data); err != nil {
			return err
		}

		if data.TileID == 0 {
			return errors.New("unknown tile identifier")
		}

		err = state.RecallTile(player.Index, data.TileID)
	case "discard":
		var data RushDiscard
		if err = json.Unmarshal(message, &data); err != nil {
			return err
		}

		if data.TileID == 0 {
			return errors.New("unknown tile identifier")
		}

		if err = state.Discard(player.Index, data.TileID); err != nil && !state.Finished {
			return err
		}

		// No error, send a state message back to the player.
		var response RushStateNotification
		response.LoadFromGame(state, player.Index)
		response.LoadFromController(game, player)
		response.ReplyTo = header.MessageID

		c.undispatch(game, player, response.MessageID, response.ReplyTo, response)
	case "draw":
		var data RushDraw
		if err = json.Unmarshal(message, &data); err != nil {
			return err
		}

		if data.DrawID == 0 {
			return errors.New("unknown draw identifier")
		}

		if err = state.Draw(player.Index, data.DrawID); err != nil && !state.Finished {
			log.Println("Returning", err, state.Finished)
			return err
		}

		if err == nil {
			// Notify everyone else that this player drew. In the event that this
			// player won, err != nil and we skip this step.
			for _, indexed_player := range game.ToPlayer {
				var drew RushDrawNotification
				drew.LoadFromController(game, indexed_player, player.UID)
				c.undispatch(game, indexed_player, drew.MessageID, 0, drew)

				// If this player has game state, notify them that the state changed.
				if indexed_player.Index >= 0 {
					var response RushStateNotification
					response.LoadFromGame(state, indexed_player.Index)
					response.LoadFromController(game, indexed_player)

					if indexed_player.UID == player.UID {
						response.ReplyTo = header.MessageID
					}

					c.undispatch(game, indexed_player, response.MessageID, response.ReplyTo, response)
				}
			}
		}
	case "check":
		err = state.IsValidBoard(player.Index)
		if player.Index >= 0 && player.Index < len(state.Players) {
			// Note that err may either be nil or non-nil here.
			var invalid RushCheckNotification
			invalid.LoadFromGame(state, player.Index)
			invalid.LoadFromController(game, player, err)
			invalid.ReplyTo = header.MessageID

			c.undispatch(game, player, invalid.MessageID, invalid.ReplyTo, invalid)

			// Since we're sending a RushCheckNotification, don't send the default
			// error response in the event err was non-nil.
			err = nil
		}
	case "peek":
		if !state.Started {
			return errors.New("unable to peek at game which hasn't started yet")
		}

		if !state.Finished && (player.Index >= 0 || player.Playing) {
			return errors.New("no peeking allowed when the game isn't yet finished")
		}

		var response RushGameStateNotification
		response.LoadFromGame(state)
		response.LoadFromController(game, player)
		response.ReplyTo = header.MessageID
		c.undispatch(game, player, response.MessageID, response.ReplyTo, response)
	default:
		return errors.New("unknown message_type issued to rush game: " + header.MessageType)
	}

	if !was_finished && state.Finished {
		// Notify everyone that the game ended and that this active player won.
		for _, indexed_player := range game.ToPlayer {
			var finished RushFinishedNotification
			finished.LoadFromController(game, indexed_player, player.UID)
			c.undispatch(game, indexed_player, finished.MessageID, 0, finished)
		}
	}

	return err
}

func (c *Controller) doRushStart(game *GameData, state *RushState) error {
	// First count the number of people playing.
	var players int = 0
	for _, player := range game.ToPlayer {
		if player.Playing {
			players += 1
		}
	}

	// Then start the underlying Rush game to populate game data.
	if err := state.Start(players); err != nil {
		return err
	}

	// Then assign indices to players who are playing and send out their
	// initial state data. Also notify all players that the game has started.
	var player_index int = 0
	for _, indexed_player := range game.ToPlayer {
		// Tell everyone interested that the game has started.
		var started ControllerNotifyStarted
		started.LoadFromController(game, indexed_player)
		c.undispatch(game, indexed_player, started.MessageID, started.ReplyTo, started)

		// Only assign indices to people who were marked as players by the game
		// admin.
		if indexed_player.Playing {
			indexed_player.Index = player_index

			var response RushStateNotification
			response.LoadFromGame(state, player_index)
			response.LoadFromController(game, indexed_player)

			// XXX: Handle 3 2 1 countdown.
			c.undispatch(game, indexed_player, response.MessageID, 0, response)

			player_index++
		}
	}

	return nil
}