package games

import (
	"encoding/json"
	"errors"
	"log"
	"strconv"
	"sync"
	"time"

	"gorm.io/gorm"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/figgy"
)

// Add a new game to a controller. Note that, while configuration information
// is populated, the game isn't yet started.
func (c *Controller) addGame(modeRepr string, gid uint64, owner uint64, config figgy.Figgurable) error {
	// !!NO LOCK!! This should already be held elsewhere, like LoadGame.
	// If the game exists, throw an error.
	if c.GameExists(gid) {
		return errors.New("game with specified id (" + strconv.FormatUint(gid, 10) + ") already exists in controller")
	}

	// If game is of an invalid mode, exit. Currently we only support a single
	// type of game, Rush!.
	var mode GameMode = GameModeFromString(modeRepr)
	if !mode.IsValid() {
		return errors.New("unknown game mode: " + modeRepr)
	}

	var err error
	game := new(GameData)
	game.lock = sync.Mutex{}
	game.State, err = mode.Init(config)
	if err != nil {
		return err
	}

	game.GID = gid
	game.Mode = mode
	game.Owner = owner
	// game.State set above.
	game.ToPlayer = make(map[uint64]*PlayerData)
	game.Countdown = 0
	game.CountdownTimer = nil

	c.ToGame[gid] = game

	return nil
}

func (c *Controller) notifyAdmin(game *GameData, uid uint64) error {
	// !!NO LOCK!! This should already be held elsewhere, like Dispatch.
	// Don't notify the owner that they joined. Presumably, they already know.
	if game.Owner == uid {
		return nil
	}

	var admin *PlayerData = game.ToPlayer[game.Owner]
	if admin == nil {
		return errors.New("unable to join game without a connected admin")
	}

	var joined *PlayerData = game.ToPlayer[uid]
	if joined == nil {
		return errors.New("unable to notify admin of player who doesn't exist")
	}

	var notification ControllerNotifyAdminJoin
	notification.LoadFromController(game, admin, joined)

	c.undispatch(game, admin, notification.MessageID, 0, notification)
	return nil
}

// Mark a player as being ready to play. This can and should be controlled
// by the player and not by a game admin.
func (c *Controller) markReady(gid uint64, uid uint64, ready bool) error {
	// !!NO LOCK!! This should already be held elsewhere, like AddPlayer.

	if !c.GameExists(gid) {
		return errors.New("game with specified id (" + strconv.FormatUint(gid, 10) + ") does not exists in controller")
	}

	if !c.PlayerExists(gid, uid) {
		return errors.New("player with specified id (" + strconv.FormatUint(uid, 10) + ") does not exists in controller for game (" + strconv.FormatUint(gid, 10) + ")")
	}

	game := c.ToGame[gid]
	player := game.ToPlayer[uid]
	player.Ready = ready

	var notification ControllerNotifyAdmitted
	notification.LoadFromController(game, player)
	c.undispatch(game, player, notification.MessageID, 0, notification)

	for _, indexed_player := range game.ToPlayer {
		// Only let admitted players know who else is in the room.
		if !indexed_player.Admitted {
			continue
		}

		var users ControllerListUsersInGame
		users.LoadFromController(game, indexed_player)
		c.undispatch(game, indexed_player, users.MessageID, 0, users)
	}

	return nil
}

// Mark a player as being admitted to the game. This should be controlled by
// the game admin and not the players themselves. The exception to this is
// that users joining by individual invite tokens should be auto-admitted as
// they were previously invited individually.
func (c *Controller) markAdmitted(us uint64, gid uint64, uid uint64, admitted bool, playing bool) error {
	// !!NO LOCK!! This should already be held elsewhere, like Dispatch.

	if !c.GameExists(gid) {
		return errors.New("game with specified id (" + strconv.FormatUint(gid, 10) + ") does not exists in controller")
	}

	if !c.PlayerExists(gid, uid) {
		return errors.New("player with specified id (" + strconv.FormatUint(uid, 10) + ") does not exists in controller (" + strconv.FormatUint(gid, 10) + ")")
	}

	game := c.ToGame[gid]
	player := game.ToPlayer[uid]

	if player.Admitted != admitted && us != game.Owner {
		return errors.New("player with specified id (" + strconv.FormatUint(us, 10) + ") does not have authorization to change admitted status for " + strconv.FormatUint(uid, 10))
	}

	// The owner has to be admitted. :-)
	if uid == game.Owner {
		admitted = true
	}

	if !admitted {
		player.Admitted = false
		player.Playing = false
	} else {
		player.Admitted = true
		player.Playing = playing
	}

	if err := database.InTransaction(func(tx *gorm.DB) error {
		var game_player database.GamePlayer
		if err := tx.First(&game_player, "user_id = ? AND game_id = ?", uid, gid).Error; err != nil {
			return err
		}

		game_player.Admitted = admitted

		return tx.Save(&game_player).Error
	}); err != nil {
		log.Println("error changing admitted state of player (", uid, ") in game (", gid, "):", err)
	}

	var notification ControllerNotifyAdmitted
	notification.LoadFromController(game, player)
	c.undispatch(game, player, notification.MessageID, 0, notification)

	for _, indexed_player := range game.ToPlayer {
		// Only let admitted players know who else is in the room.
		if !indexed_player.Admitted {
			continue
		}

		var users ControllerListUsersInGame
		users.LoadFromController(game, indexed_player)
		c.undispatch(game, indexed_player, users.MessageID, 0, users)
	}

	return nil
}

func (c *Controller) undispatch(data *GameData, player *PlayerData, message_id int, reply_to int, obj interface{}) {
	if player.Notifications == nil {
		log.Println("Player disconnected; refusing to send message to peer.", player.UID)
		return
	}

	message, err := json.Marshal(obj)
	if err != nil {
		log.Println("Unable to marshal data to send to peer:", data.GID, player.UID, err, obj)
		return
	}

	player.Notifications <- obj

	var db_msg = database.GameMessage{
		UserID:    player.UID,
		GameID:    data.GID,
		Timestamp: time.Now(),
		Message:   string(message),
	}
	player.OutboundMsgs = append(player.OutboundMsgs, &db_msg)
}
