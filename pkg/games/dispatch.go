package games

import (
	"encoding/json"
	"errors"
	"log"
	"time"
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
		return c.handleCountdown(game)
	case "join":
		log.Println("Handling join message -- ", state.Started, state.Finished)
		if state.Started && !state.Finished {
			var started ControllerNotifyStarted
			started.LoadFromController(game, player)
			started.ReplyTo = header.MessageID
			c.undispatch(game, player, started.MessageID, started.ReplyTo, started)

			log.Println("Sent notification that game started -- ", player.Admitted, player.Index)

			if player.Admitted && player.Index >= 0 {
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
	default:
		err = errors.New("unknown message_type issued to rush game: " + header.MessageType)
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
		if player.Admitted {
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

		// Only assign indices to people who were admitted by the game admin.
		if indexed_player.Admitted {
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

type GameCountback struct {
	MessageHeader
	Value int `json:"value"`
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

		return c.markAdmitted(game.GID, data.Target, data.Admit)
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
	case "countback":
		var data GameCountback
		if err := json.Unmarshal(message, &data); err != nil {
			return err
		}

		if data.Value == game.Countdown {
			player.Countback = data.Value
		}

		return c.handleCountdown(game)
	}

	if game.Mode != RushGame {
		panic("Valid but unsupported game mode: " + game.Mode.String())
	}

	return c.dispatchRush(message, header, game, player)
}

func (c *Controller) handleCountdown(game *GameData) error {
	log.Println("handleCountdown - ", game)

	var sendNext bool = true
	for _, player := range game.ToPlayer {
		if player.Countback != game.Countdown {
			sendNext = false
		}
	}

	if !sendNext {
		log.Println("Not sending next -- at least one mismatch")
		return nil
	}

	if game.Countdown == 0 && game.CountdownTimer == nil {
		log.Println("Starting countdown at 3...")
		game.Countdown = 3
		game.CountdownTimer = time.NewTimer(countdownDelay)

		for _, player := range game.ToPlayer {
			player.Countback = game.Countdown + 1
			var message ControllerCountdown
			message.LoadFromController(game, player)
			c.undispatch(game, player, message.MessageID, 0, message)

			log.Println("Sent message to ", player)
		}
	} else if game.Countdown == 0 {
		log.Println("Countdown at 0, starting game!")

		// XXX: Update when adding more modes
		if game.Mode != RushGame {
			panic("Unknown game mode: " + game.Mode.String())
		}

		var state *RushState = game.State.(*RushState)
		return c.doRushStart(game, state)
	} else {
		log.Println("Continuing countdown...", game.Countdown)

		// Ensure the previous timer has elapsed, or wait until it does.
		<-game.CountdownTimer.C
		game.Countdown = game.Countdown - 1
		game.CountdownTimer = time.NewTimer(countdownDelay)

		for _, player := range game.ToPlayer {
			player.Countback = game.Countdown + 1
			var message ControllerCountdown
			message.LoadFromController(game, player)
			c.undispatch(game, player, message.MessageID, 0, message)
		}
	}

	return nil
}
