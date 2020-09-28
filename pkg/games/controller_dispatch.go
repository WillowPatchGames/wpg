package games

import (
	"encoding/json"
	"errors"
	"time"
)

type GameAdmit struct {
	MessageHeader
	Target  uint64 `json:"target_id"`
	Admit   bool   `json:"admit"`
	Playing bool   `json:"playing"`
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
	case "join":
		// When the user is the admin, send them a bunch of notify-joins again.
		// This lets them see users who are already in the room... :-)
		if player.UID == game.Owner {
			for _, indexed_player := range game.ToPlayer {
				if indexed_player.UID == game.Owner {
					continue
				}

				err := c.notifyAdmin(game, indexed_player.UID)
				if err != nil {
					return err
				}
			}
		}
	case "admit":
		var data GameAdmit
		if err := json.Unmarshal(message, &data); err != nil {
			return err
		}

		if player.UID != game.Owner {
			return errors.New("player not authorized to admit other players")
		}

		return c.markAdmitted(game.GID, data.Target, data.Admit, data.Playing)
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
	var sendNext bool = true
	for _, player := range game.ToPlayer {
		// Only check for countbacks from players. We don't care whether or not
		// spectators can see the board.
		if player.Admitted && player.Playing && player.Countback != game.Countdown {
			sendNext = false
		}
	}

	if !sendNext {
		return nil
	}

	if game.Countdown == 0 && game.CountdownTimer == nil {
		game.Countdown = 4
		game.CountdownTimer = time.NewTimer(1 * time.Nanosecond)
		// Fall through -- this decrements the above countdown by one and sends out
		// the countdown messages.
	} else if game.Countdown == 0 {
		// XXX: Update when adding more modes
		if game.Mode != RushGame {
			panic("Unknown game mode: " + game.Mode.String())
		}

		var state *RushState = game.State.(*RushState)
		if !state.Started {
			return c.doRushStart(game, state)
			// Must return!
		}
	}

	// Ensure the previous timer has elapsed, or wait until it does.
	// XXX -- this blocks currently. Make it async or put in a separate
	// goroutine.
	<-game.CountdownTimer.C
	game.Countdown = game.Countdown - 1
	game.CountdownTimer = time.NewTimer(countdownDelay)

	for _, player := range game.ToPlayer {
		if !player.Admitted {
			continue
		}

		player.Countback = game.Countdown + 1
		var message ControllerCountdown
		message.LoadFromController(game, player)
		c.undispatch(game, player, message.MessageID, 0, message)
	}

	return nil
}