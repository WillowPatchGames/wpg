package games

import (
	"encoding/json"
	"errors"

	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/figgy"
)

// Hearts message types:
//
// 1. Deal
// 2. PassCards
// 3. PlayCard

type HeartsPassMsg struct {
	MessageHeader
	ToPass []int `json:"to_pass"`
}

type HeartsPlayMsg struct {
	MessageHeader
	CardID int `json:"card_id"`
}

func (c *Controller) dispatchHearts(message []byte, header MessageHeader, game *GameData, player *PlayerData, sid uint64) error {
	var err error
	var state *HeartsState = game.State.(*HeartsState)
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
		if err = figgy.Validate(state.Config); err != nil {
			return err
		}

		if state.Config.Countdown {
			game.Countdown = 0
			game.CountdownTimer = nil

			return c.handleCountdown(game)
		} else {
			return c.doHeartsStart(game, state)
		}
	case "cancel":
		if player.UID != game.Owner {
			return errors.New("unable to cancel game that you're not the owner of")
		}

		if !state.Config.Countdown {
			return errors.New("unable to cancel game that doesn't use a countdown")
		}

		if state.Started || state.Finished {
			return errors.New("unable to cancel game that is already started")
		}

		game.Countdown = 0
		game.CountdownTimer = nil
	case "join":
		if state.Started && !state.Finished {
			var started ControllerNotifyStarted
			started.LoadFromController(game, player)
			started.ReplyTo = header.MessageID
			c.undispatch(game, player, started.MessageID, started.ReplyTo, started)

			if player.Playing && player.Index >= 0 {
				var response HeartsStateNotification
				response.LoadData(game, state, player)
				c.undispatch(game, player, response.MessageID, 0, response)

				send_synopsis = true
			}
		} else if state.Finished {
			var finished HeartsFinishedNotification
			finished.LoadData(game, state, player)
			finished.ReplyTo = header.MessageID
			c.undispatch(game, player, finished.MessageID, finished.ReplyTo, finished)
			send_synopsis = true
		}
	case "deal":
		if player.Index != state.Dealer {
			return errors.New("unable to deal round that you're not the dealer for")
		}

		err = state.StartRound()
		send_synopsis = err != nil
		send_state = err != nil
	case "pass":
		var data HeartsPassMsg
		if err = json.Unmarshal(message, &data); err != nil {
			return err
		}

		err = state.PassCards(player.Index, data.ToPass)
		send_synopsis = err == nil
		send_state = true
	case "play":
		var data HeartsPlayMsg
		if err = json.Unmarshal(message, &data); err != nil {
			return err
		}

		err = state.PlayCard(player.Index, data.CardID)
		send_synopsis = true
		send_state = true
	case "peek":
		if player.Index != -1 && !state.Finished {
			return errors.New("can only peek once game is complete")
		}

		var response HeartsPeekNotification
		response.LoadData(game, state, player)
		response.ReplyTo = header.MessageID
		c.undispatch(game, player, response.MessageID, header.MessageID, response)

		var synopsis HeartsSynopsisNotification
		synopsis.LoadData(game, state, player)
		c.undispatch(game, player, synopsis.MessageID, 0, synopsis)
	default:
		return errors.New("unknown message_type issued to hearts game: " + header.MessageType)
	}

	// If this game ended during this dispatch call, notify everyone.
	if !was_finished && state.Finished {
		// Notify everyone that the game ended and that this active player won.
		for _, indexed_player := range game.ToPlayer {
			var finished HeartsFinishedNotification
			finished.LoadData(game, state, indexed_player)
			c.undispatch(game, indexed_player, finished.MessageID, 0, finished)
		}
	}

	// If someone changed something, notify everyone.
	if send_synopsis {
		for _, indexed_player := range game.ToPlayer {
			var synopsis HeartsSynopsisNotification
			synopsis.LoadData(game, state, indexed_player)
			c.undispatch(game, indexed_player, synopsis.MessageID, 0, synopsis)
		}
	}

	// If the state changed for a bunch of people, notify them all.
	if send_state {
		for _, indexed_player := range game.ToPlayer {
			if !indexed_player.Admitted {
				continue
			}

			if indexed_player.Playing {
				// Send players their initial state. Mark it as a reply to the player
				// who originally dealt, so they know the deal was successful.
				var response HeartsStateNotification
				response.LoadData(game, state, indexed_player)
				if indexed_player.UID == player.UID && err == nil {
					response.ReplyTo = header.MessageID
				}

				c.undispatch(game, indexed_player, response.MessageID, response.ReplyTo, response)
			} else {
				var response HeartsPeekNotification
				response.LoadData(game, state, indexed_player)
				c.undispatch(game, indexed_player, response.MessageID, 0, response)
			}
		}
	}

	return err
}

func (c *Controller) doHeartsStart(game *GameData, state *HeartsState) error {
	// First count the number of people playing.
	var players int = 0
	for _, player := range game.ToPlayer {
		if player.Playing {
			players += 1
		}
	}

	// Then start the underlying Hearts game to populate game data.
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
			var response HeartsStateNotification
			response.LoadData(game, state, indexed_player)
			c.undispatch(game, indexed_player, response.MessageID, 0, response)
		}

		// Give everyone the initial synopsis.
		var synopsis HeartsSynopsisNotification
		synopsis.LoadData(game, state, indexed_player)
		c.undispatch(game, indexed_player, synopsis.MessageID, 0, synopsis)
	}

	return nil
}
