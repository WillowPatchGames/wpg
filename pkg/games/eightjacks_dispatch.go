package games

import (
	"encoding/json"
	"errors"
)

// EightJacks message types:
//
// 0. Assign teams (while waiting to start -- handled by owner)
// 1. Start -> StartRound(), which handles card assignments, board creation, &c.
// 2. Discard duplicate
// 3. Play card
// 4. Mark run (anyone -- including spectators)

type EightJacksAssignMsg struct {
	MessageHeader
	Dealer          int     `json:"dealer"`
	NumPlayers      int     `json:"num_players"`
	TeamAssignments [][]int `json:"team_assignments"`
}

type EightJacksDiscardMsg struct {
	MessageHeader
	CardID int `json:"card_id"`
}

type EightJacksPlayMsg struct {
	MessageHeader
	CardID   int `json:"card_id"`
	SquareID int `json:"square_id"`
}

type EightJacksMarkMsg struct {
	MessageHeader
	Squares []int `json:"squares"`
}

func (c *Controller) dispatchEightJacks(message []byte, header MessageHeader, game *GameData, player *PlayerData) error {
	var err error
	var state *EightJacksState = game.State.(*EightJacksState)
	if state == nil {
		panic("internal state is nil; this shouldn't happen when the game is started")
	}

	var was_finished = state.Finished
	var send_synopsis = false
	var send_state = false

	switch header.MessageType {
	case "assign":
		if player.UID != game.Owner {
			return errors.New("unable to start game that you're not the owner of")
		}

		var data EightJacksAssignMsg
		if err = json.Unmarshal(message, &data); err != nil {
			return err
		}

		err = state.AssignTeams(data.Dealer, data.NumPlayers, data.TeamAssignments)
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

		if players != state.Config.NumPlayers || !state.Assigned {
			return errors.New("must finish configuring assignments for this game")
		}

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
				var response EightJacksStateNotification
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

			var finished EightJacksFinishedNotification
			finished.LoadFromController(game, player, winner)
			finished.ReplyTo = header.MessageID
			c.undispatch(game, player, finished.MessageID, finished.ReplyTo, finished)
		}
	case "discard":
		var data EightJacksDiscardMsg
		if err = json.Unmarshal(message, &data); err != nil {
			return err
		}

		err = state.DiscardDuplicate(player.Index, data.CardID)
		send_synopsis = err == nil
		send_state = err == nil
	case "play":
		var data EightJacksPlayMsg
		if err = json.Unmarshal(message, &data); err != nil {
			return err
		}

		err = state.PlayCard(player.Index, data.CardID, data.SquareID)
		send_synopsis = err == nil
		send_state = err == nil
	case "mark":
		var data EightJacksMarkMsg
		if err = json.Unmarshal(message, &data); err != nil {
			return err
		}

		err = state.MarkRun(data.Squares)
		send_synopsis = err == nil
		send_state = err == nil
	default:
		return errors.New("unknown message_type issued to spades game: " + header.MessageType)
	}

	// If this game ended during this dispatch call, notify everyone.
	if !was_finished && state.Finished {
		// Notify everyone that the game ended and that this active player won.
		for _, indexed_player := range game.ToPlayer {
			var finished EightJacksFinishedNotification
			finished.LoadFromController(game, indexed_player, player.UID)
			c.undispatch(game, indexed_player, finished.MessageID, 0, finished)
		}
	}

	// If someone changed something, notify everyone.
	if send_synopsis {
		for _, indexed_player := range game.ToPlayer {
			var synopsis EightJacksSynopsisNotification
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
			var response EightJacksStateNotification
			response.LoadData(game, state, indexed_player)
			if indexed_player.UID == player.UID {
				response.ReplyTo = header.MessageID
			}

			c.undispatch(game, indexed_player, response.MessageID, response.ReplyTo, response)
		}
	}

	return err
}

func (c *Controller) doEightJacksStart(game *GameData, state *EightJacksState) error {
	// First count the number of people playing.
	var players int = 0
	for _, player := range game.ToPlayer {
		if player.Playing {
			players += 1
		}
	}

	if players != state.Config.NumPlayers || !state.Assigned {
		return errors.New("must finish configuring assignments for this game")
	}

	// Then start the underlying EightJacks game to populate game data.
	if err := state.Start(players); err != nil {
		return err
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
			var response EightJacksStateNotification
			response.LoadData(game, state, indexed_player)
			c.undispatch(game, indexed_player, response.MessageID, 0, response)
		}

		// Give everyone the initial synopsis.
		var synopsis EightJacksSynopsisNotification
		synopsis.LoadData(game, state, indexed_player)
		c.undispatch(game, indexed_player, synopsis.MessageID, 0, synopsis)
	}

	return nil
}