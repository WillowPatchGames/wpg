package games

import (
	"encoding/json"
	"errors"

	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/figgy"
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
	Dealer          int      `json:"dealer"`
	NumPlayers      int      `json:"num_players"`
	PlayerMaps      []uint64 `json:"player_map"`
	TeamAssignments [][]int  `json:"team_assignments"`
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

type EightJacksSortMsg struct {
	MessageHeader
	Order []int `json:"order"`
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
			return errors.New("unable to assign players to game that you're not the owner of")
		}

		var data EightJacksAssignMsg
		if err = json.Unmarshal(message, &data); err != nil {
			return err
		}

		if data.NumPlayers != len(data.PlayerMaps) {
			return errors.New("incorrect number of players compared to player map")
		}

		err = state.AssignTeams(data.Dealer, data.NumPlayers, data.TeamAssignments)
		if err == nil {
			// Set unused players to -1 before setting used players,
			// in case a previous configuration was set but cancelled
			for _, player := range game.ToPlayer {
				player.Index = -1
			}
			for i, playerID := range data.PlayerMaps {
				player, ok := game.ToPlayer[playerID]

				if !ok {
					return errors.New("unknown player")
				}

				player.Index = i
			}

			var response MessageHeader
			response.LoadHeader(game, player)
			response.ReplyTo = header.MessageID

			c.undispatch(game, player, response.MessageID, response.ReplyTo, response)
		}
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

		if players == 0 || players != state.Config.NumPlayers || !state.Assigned {
			return errors.New("must finish configuring assignments for this game")
		}

		if err = figgy.Validate(state.Config); err != nil {
			return err
		}

		if state.Config.Countdown {
			game.Countdown = 0
			game.CountdownTimer = nil

			return c.handleCountdown(game)
		} else {
			return c.doEightJacksStart(game, state)
		}
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
			if player.Admitted && player.Playing {
				var response EightJacksStateNotification
				response.LoadData(game, state, player)

				c.undispatch(game, player, response.MessageID, 0, response)
			}

			var finished EightJacksFinishedNotification
			finished.LoadData(game, state, player)
			finished.ReplyTo = header.MessageID
			c.undispatch(game, player, finished.MessageID, finished.ReplyTo, finished)
			send_synopsis = true
		}
	case "discard":
		var data EightJacksDiscardMsg
		if err = json.Unmarshal(message, &data); err != nil {
			return err
		}

		err = state.DiscardDuplicate(player.Index, data.CardID)
		send_synopsis = true
		send_state = true
	case "play":
		var data EightJacksPlayMsg
		if err = json.Unmarshal(message, &data); err != nil {
			return err
		}

		err = state.PlayCard(player.Index, data.CardID, data.SquareID)
		send_synopsis = true
		send_state = true
	case "mark":
		var data EightJacksMarkMsg
		if err = json.Unmarshal(message, &data); err != nil {
			return err
		}

		err = state.MarkRun(data.Squares)
		send_synopsis = true
		send_state = true
	case "sort":
		var data EightJacksSortMsg
		if err = json.Unmarshal(message, &data); err != nil {
			return err
		}

		err = state.Order(player.Index, data.Order)
		send_state = true
	case "peek":
		var response EightJacksPeekNotification
		response.LoadData(game, state, player)
		response.ReplyTo = header.MessageID
		c.undispatch(game, player, response.MessageID, header.MessageID, response)

		var synopsis EightJacksSynopsisNotification
		synopsis.LoadData(game, state, player)
		c.undispatch(game, player, synopsis.MessageID, 0, synopsis)
	default:
		return errors.New("unknown message_type issued to spades game: " + header.MessageType)
	}

	// If this game ended during this dispatch call, notify everyone.
	if !was_finished && state.Finished {
		// Notify everyone that the game ended and that this active player won.
		for _, indexed_player := range game.ToPlayer {
			var finished EightJacksFinishedNotification
			finished.LoadData(game, state, indexed_player)
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
			if !indexed_player.Admitted {
				continue
			}

			if indexed_player.Playing {
				// Send players their initial state. Mark it as a reply to the player
				// who originally dealt, so they know the deal was successful.
				var response EightJacksStateNotification
				response.LoadData(game, state, indexed_player)
				if indexed_player.UID == player.UID && err == nil {
					response.ReplyTo = header.MessageID
				}
				c.undispatch(game, indexed_player, response.MessageID, response.ReplyTo, response)
			} else {
				var response EightJacksPeekNotification
				response.LoadData(game, state, indexed_player)
				c.undispatch(game, indexed_player, response.MessageID, 0, response)
			}
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

	if players == 0 || players != state.Config.NumPlayers || !state.Assigned {
		return errors.New("must finish configuring assignments for this game")
	}

	// Then start the underlying EightJacks game to populate game data.
	if err := state.Start(); err != nil {
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
