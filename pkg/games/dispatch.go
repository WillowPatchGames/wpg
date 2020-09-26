package games

import (
	"encoding/json"
	"errors"
	"log"
	"time"
)

type GameAdmit struct {
	MessageHeader
	Target    uint64 `json:"target_id"`
	Admit     bool   `json:"admit"`
	Spectator bool   `json:"specator"`
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

		return c.markAdmitted(game.GID, data.Target, data.Admit, data.Spectator)
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
		if player.Admitted && player.Countback != game.Countdown {
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
			// Only send coundown notifications to players who are admitted.
			// Otherwise it doesn't matter too much.
			if !player.Admitted {
				continue
			}

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
			if !player.Admitted {
				continue
			}

			player.Countback = game.Countdown + 1
			var message ControllerCountdown
			message.LoadFromController(game, player)
			c.undispatch(game, player, message.MessageID, 0, message)
		}
	}

	return nil
}
