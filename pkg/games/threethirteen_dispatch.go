package games

import (
	"encoding/json"
	"errors"
)

// ThreeThirteen message types:
//
// 1. Deal
// 2. Take
// 3. Discard
// 4. Score

type ThreeThirteenTakeMsg struct {
	MessageHeader
	FromDiscard bool `json:"from_discard"`
}

type ThreeThirteenDiscardMsg struct {
	MessageHeader
	CardID     int  `json:"card_id"`
	LayingDown bool `json:"laying_down"`
}

type ThreeThirteenScoreMsg struct {
	MessageHeader
	Score int `json:"score"`
}

func (c *Controller) dispatchThreeThirteen(message []byte, header MessageHeader, game *GameData, player *PlayerData) error {
	var err error
	var state *ThreeThirteenState = game.State.(*ThreeThirteenState)
	if state == nil {
		panic("internal state is nil; this shouldn't happen when the game is started")
	}

	var was_finished = state.Finished
	var send_synopsis = false
	var send_state = false

	switch header.MessageType {
	case "start":
		if player.UID != game.Owner {
			return errors.New("unable to start game that you're not the owner of")
		}

		var players int = 0
		for _, player := range game.ToPlayer {
			if player.Playing {
				// When we click the start button again, say, after a user has come
				// back to being active, Countback will be higher than 0, because we've
				// already attempted to set this.
				player.Countback = 0
				players += 1
			}
		}

		state.Config.NumPlayers = players
		if err = state.Config.Validate(); err != nil {
			return err
		}

		game.Countdown = 0
		game.CountdownTimer = nil

		return c.handleCountdown(game)
	case "join":
		if state.Started && !state.Finished {
			var started ControllerNotifyStarted
			started.LoadFromController(game, player)
			started.ReplyTo = header.MessageID
			c.undispatch(game, player, started.MessageID, started.ReplyTo, started)

			if player.Playing && player.Index >= 0 {
				var response ThreeThirteenStateNotification
				response.LoadData(game, state, player)

				c.undispatch(game, player, response.MessageID, 0, response)

				send_synopsis = true
			}
		} else if state.Finished {
			var winner uint64 = 0
			for _, indexed_player := range game.ToPlayer {
				if state.Winner == indexed_player.Index {
					winner = indexed_player.UID
					break
				}
			}

			var finished ThreeThirteenFinishedNotification
			finished.LoadFromController(game, player, winner)
			finished.ReplyTo = header.MessageID
			c.undispatch(game, player, finished.MessageID, finished.ReplyTo, finished)
		}
	case "deal":
		if state.Dealt {
			return errors.New("it is not yet time to deal")
		}

		if player.Index != state.Dealer {
			return errors.New("unable to deal round that you're not the dealer for")
		}

		err = state.StartRound()
		if err == nil {
			send_synopsis = true
			send_state = true
		}
	case "take":
		var data ThreeThirteenTakeMsg
		if err = json.Unmarshal(message, &data); err != nil {
			return err
		}

		err = state.TakeCard(player.Index, data.FromDiscard)
		send_synopsis = err == nil

		if player.Playing && player.Index >= 0 {
			var response ThreeThirteenStateNotification
			response.LoadData(game, state, player)
			c.undispatch(game, player, response.MessageID, header.MessageID, response)
		}
	case "discard":
		var data ThreeThirteenDiscardMsg
		if err = json.Unmarshal(message, &data); err != nil {
			return err
		}

		err = state.DiscardCard(player.Index, data.CardID, data.LayingDown)
		send_synopsis = err == nil
		send_state = true
	case "score":
		var data ThreeThirteenScoreMsg
		if err = json.Unmarshal(message, &data); err != nil {
			return err
		}

		err = state.ReportScore(player.Index, data.Score)
		send_synopsis = true
		send_state = true
	default:
		return errors.New("unknown message_type issued to ThreeThirteen game: " + header.MessageType)
	}

	// If this game ended during this dispatch call, notify everyone.
	if !was_finished && state.Finished {
		// Notify everyone that the game ended and that this active player won.
		for _, indexed_player := range game.ToPlayer {
			var finished ThreeThirteenFinishedNotification
			finished.LoadFromController(game, indexed_player, player.UID)
			c.undispatch(game, indexed_player, finished.MessageID, 0, finished)
		}
	}

	// If someone changed something, notify everyone.
	if send_synopsis {
		for _, indexed_player := range game.ToPlayer {
			var synopsis ThreeThirteenSynopsisNotification
			synopsis.LoadData(game, state, indexed_player)
			c.undispatch(game, indexed_player, synopsis.MessageID, 0, synopsis)
		}
	}

	// If the state changed for a bunch of people, notify them all.
	if send_state {
		for _, indexed_player := range game.ToPlayer {
			if !indexed_player.Admitted || !indexed_player.Playing {
				continue
			}

			// Send players their initial state. Mark it as a reply to the player
			// who originally dealt, so they know the deal was successful.
			var response ThreeThirteenStateNotification
			response.LoadData(game, state, indexed_player)
			if indexed_player.UID == player.UID {
				response.ReplyTo = header.MessageID
			}

			c.undispatch(game, indexed_player, response.MessageID, response.ReplyTo, response)
		}
	}

	return err
}

func (c *Controller) doThreeThirteenStart(game *GameData, state *ThreeThirteenState) error {
	// First count the number of people playing.
	var players int = 0
	for _, player := range game.ToPlayer {
		if player.Playing {
			players += 1
		}
	}

	// Then start the underlying ThreeThirteen game to populate game data.
	if err := state.Start(players); err != nil {
		return err
	}

	// Assign indices to players before sending notifications.
	var player_index int = 0
	for _, indexed_player := range game.ToPlayer {
		if indexed_player.Admitted && indexed_player.Playing {
			indexed_player.Index = player_index
			player_index++
		}
	}

	// Send out initial state data to individuals who are playing. Also notify
	// all players that the game has started.
	for _, indexed_player := range game.ToPlayer {
		if !indexed_player.Admitted {
			continue
		}

		// Tell everyone interested that the game has started.
		var started ControllerNotifyStarted
		started.LoadFromController(game, indexed_player)
		c.undispatch(game, indexed_player, started.MessageID, started.ReplyTo, started)

		// Only send state to players who are playing initially. Everyone else
		// (namely, admitted spectators) should send a peek event before they can
		// view the grid.
		if indexed_player.Playing {
			var response ThreeThirteenStateNotification
			response.LoadData(game, state, indexed_player)
			c.undispatch(game, indexed_player, response.MessageID, 0, response)
		}

		// Give everyone the initial synopsis.
		var synopsis ThreeThirteenSynopsisNotification
		synopsis.LoadData(game, state, indexed_player)
		c.undispatch(game, indexed_player, synopsis.MessageID, 0, synopsis)
	}

	return nil
}
