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

const (
	// Time between countdown events
	countdownDelay = 2 * time.Second

	// Size of the notification queue for a player, number of messages.
	notificationQueueLength = 1024
)

// Controller wraps GameData and handles the parsing of messages from the
// websocket or other connection. dispatch.go handles the actual dispatch
// into game specific commands understood by a game implementation. We lock
// around ToGame to prevent concurrent access and modification to games. This
// lets us lock within Controller (and calls to Controller methods) without
// having our callers lock. Because access to the entire controller is locked,
// we need not lock access to the PlayerData inside. Additionally, we assume
// games have internal locks of their own, preventing concurrent modification
// from corrupting the state.
type Controller struct {
	lock   sync.Mutex
	ToGame map[uint64]*GameData `json:"games"`
}

// Initialize a Controller object.
func (c *Controller) Init() {
	// Locks don't need to be initialized.
	c.ToGame = make(map[uint64]*GameData)
}

// Whether or not a given game exists and is tracked by this controller
// instance.
func (c *Controller) GameExists(gid uint64) bool {
	_, ok := c.ToGame[gid]
	return ok
}

func (c *Controller) LoadGame(gamedb *database.Game) error {
	if gamedb == nil {
		return errors.New("got unexpectedly null database when attempting to load game into controller")
	}

	if gamedb.Lifecycle == "deleted" {
		return errors.New("refusing to load deleted game")
	}

	c.lock.Lock()
	defer c.lock.Unlock()

	var data GameData
	var mode GameMode = GameModeFromString(gamedb.Style)
	data.State = mode.NewState()

	if gamedb.State.Valid {
		if err := json.Unmarshal([]byte(gamedb.State.String), &data); err != nil {
			return err
		}
	}

	if data.GID != gamedb.ID {
		// Assume this game hasn't yet been initialized. Create a new game and then
		// persist it back to the database.
		var config figgy.Figgurable = mode.EmptyConfig()

		if !gamedb.Config.Valid {
			return errors.New("got unexpectedly empty game configuration")
		}

		if err := figgy.Parse(config, []byte(gamedb.Config.String)); err != nil {
			return err
		}

		// Add and initialize a new game object.
		if err := c.addGame(gamedb.Style, gamedb.ID, gamedb.OwnerID, config); err != nil {
			return err
		}
	} else {
		// Otherwise, update our copy of the game data with missing fields and
		// then add it to the controller.
		data.CountdownTimer = nil
		for _, indexed_player := range data.ToPlayer {
			indexed_player.Notifications = make(chan interface{}, notificationQueueLength)
		}

		c.ToGame[gamedb.ID] = &data
	}

	if err := c.ToGame[gamedb.ID].State.ReInit(); err != nil {
		return err
	}

	return nil
}

func (c *Controller) PersistGame(gamedb *database.Game, tx *gorm.DB) error {
	c.lock.Lock()

	if !c.GameExists(gamedb.ID) {
		c.lock.Unlock()
		return errors.New("game with specified id (" + strconv.FormatUint(gamedb.ID, 10) + ") doesn't exist in controller")
	}

	var game *GameData = c.ToGame[gamedb.ID]
	var encoded []byte
	var encoded_state []byte
	var err error
	var was_done = !(gamedb.Lifecycle == "pending" || gamedb.Lifecycle == "playing")

	if game.State != nil {
		var started = game.State.IsStarted()
		var finished = game.State.IsFinished()

		encoded, err = json.Marshal(game.State.GetConfiguration())
		if err != nil {
			c.lock.Unlock()
			return err
		}

		if !was_done {
			if !started {
				gamedb.Lifecycle = "pending"
			} else if started && !finished {
				gamedb.Lifecycle = "playing"
			} else {
				gamedb.Lifecycle = "finished"
			}

			if err := tx.Model(gamedb).Update("lifecycle", gamedb.Lifecycle).Error; err != nil {
				return err
			}
		} else if gamedb.Lifecycle == "deleted" {
			game.State.ResetStatus()
		}
	}

	encoded_state, err = json.Marshal(game)
	if err != nil {
		c.lock.Unlock()
		return err
	}

	type DatabasePlayer struct {
		UID      uint64
		GID      uint64
		Admitted bool
	}

	var persist_players []DatabasePlayer
	var persist_messages []*database.GameMessage
	for _, indexed_player := range game.ToPlayer {
		persist_players = append(persist_players, DatabasePlayer{indexed_player.UID, game.GID, indexed_player.Admitted})

		// Only keep messages which haven't yet been saved. Everything else we can
		// remove from this queue so it gets garbage collected.
		var unsaved []*database.GameMessage
		for _, message := range indexed_player.InboundMsgs {
			if message.ID == 0 {
				unsaved = append(unsaved, message)
			}
		}
		indexed_player.InboundMsgs = unsaved
		persist_messages = append(persist_messages, unsaved...)

		unsaved = nil
		for _, message := range indexed_player.OutboundMsgs {
			if message.ID == 0 {
				unsaved = append(unsaved, message)
			}
		}
		indexed_player.OutboundMsgs = unsaved
		persist_messages = append(persist_messages, unsaved...)
	}

	// Don't hold the lock while we are writing the transaction.
	c.lock.Unlock()

	s_encoded := string(encoded)
	if gamedb.Config.String != s_encoded {
		if was_done {
			if err := tx.Model(gamedb).UpdateColumn("config", s_encoded).Error; err != nil {
				return err
			}
		} else {
			if err := tx.Model(gamedb).Update("config", s_encoded).Error; err != nil {
				return err
			}
		}

		gamedb.Config.String = s_encoded
	}

	s_encoded_state := string(encoded_state)
	if gamedb.State.String != s_encoded_state {
		// Here, if the state has changed, it could just be that someone is peeking
		// at an old, expired game. Use the correct update call.
		if was_done {
			if err := tx.Model(gamedb).UpdateColumn("state", s_encoded_state).Error; err != nil {
				return err
			}
		} else {
			if err := tx.Model(gamedb).Update("state", s_encoded_state).Error; err != nil {
				return err
			}
		}

		gamedb.State.String = s_encoded_state
	}

	var candidateError error = nil
	for _, player := range persist_players {
		var game_player database.GamePlayer
		if err := tx.First(&game_player, "user_id = ? AND game_id = ?", player.UID, player.GID).Error; err != nil {
			log.Println("Unable to find game_player in database:", player.UID, "in", player.GID, err)
			candidateError = err
			continue
		}

		game_player.Admitted = player.Admitted
		if err := tx.Save(&game_player).Error; err != nil {
			log.Println("Unable to save game_player in database:", player.UID, "in", player.GID, err)
			candidateError = err
			continue
		}
	}

	if candidateError != nil {
		return candidateError
	}

	for _, message := range persist_messages {
		if err := tx.Create(message).Error; err != nil {
			log.Println("Unable to save game message in database:", err)
			candidateError = err
			continue
		}
	}

	return candidateError
}

// Remove a given game once it is no longer needed.
func (c *Controller) RemoveGame(gid uint64) error {
	c.lock.Lock()
	defer c.lock.Unlock()

	if !c.GameExists(gid) {
		return errors.New("game with specified id (" + strconv.FormatUint(gid, 10) + ") doesn't exist in controller; possible double delete")
	}

	delete(c.ToGame, gid)
	return nil
}

// Check if a given player exists (by UserID) in the given game.
func (c *Controller) PlayerExists(gid uint64, uid uint64) bool {
	game, ok := c.ToGame[gid]
	if !ok {
		return ok
	}

	_, ok = game.ToPlayer[uid]
	return ok
}

// Add a player to this game. Returns true iff the player was already
// present.
func (c *Controller) AddPlayer(gid uint64, uid uint64, admitted bool) (bool, error) {
	c.lock.Lock()
	defer c.lock.Unlock()

	if !c.GameExists(gid) {
		return false, errors.New("game with specified id (" + strconv.FormatUint(gid, 10) + ") does not exists in controller")
	}

	game := c.ToGame[gid]

	present_player, present := game.ToPlayer[uid]
	if present {
		if game.ToPlayer[uid].Notifications == nil {
			game.ToPlayer[uid].Notifications = make(chan interface{}, notificationQueueLength)
		}

		if present_player.Admitted {
			var notification ControllerNotifyAdmitted
			notification.LoadFromController(game, present_player)
			c.undispatch(game, present_player, notification.MessageID, 0, notification)
		}

		return present, nil
	}

	// By default, the owner of the game is already admitted into the game.
	var owner bool = uid == game.Owner
	player := new(PlayerData)
	player.UID = uid
	player.Index = -1
	player.Admitted = admitted || owner
	player.Playing = player.Admitted && !game.State.IsStarted() && !game.State.IsFinished() && game.CountdownTimer == nil
	player.InboundMsgs = nil
	player.OutboundID = 1
	player.OutboundMsgs = nil
	player.Notifications = make(chan interface{}, notificationQueueLength)
	game.ToPlayer[uid] = player

	if owner {
		log.Println("Adding owner to game ", game)
	}

	return false, c.notifyAdmin(game, uid)
}

func (c *Controller) PlayerLeft(gid uint64, uid uint64) {
	c.lock.Lock()
	defer c.lock.Unlock()

	if !c.GameExists(gid) {
		log.Println("game with specified id (" + strconv.FormatUint(gid, 10) + ") doesn't exist in controller; ignoring leave notificaiton")
		return
	}

	if !c.PlayerExists(gid, uid) {
		log.Println("player with specified id (" + strconv.FormatUint(uid, 10) + ") does not exists in controller (" + strconv.FormatUint(gid, 10) + "); ignoring leave notificaiton")
		return
	}

	log.Println("Removing notification socket for leaving player:", uid, "in", gid)

	game := c.ToGame[gid]
	player := game.ToPlayer[uid]
	player.Notifications = nil
}

// Remove a given game once it is no longer needed.
//
// XXX: Decide if we actually want this or not. Usually it probably isn't a
// good idea to remove a player before we flush the results to the database.
func (c *Controller) RemovePlayer(gid uint64, uid uint64) error {
	c.lock.Lock()
	defer c.lock.Unlock()

	if !c.GameExists(gid) {
		return errors.New("game with specified id (" + strconv.FormatUint(gid, 10) + ") doesn't exist in controller; possible double delete")
	}

	if !c.PlayerExists(gid, uid) {
		return errors.New("player with specified id (" + strconv.FormatUint(uid, 10) + ") does not exists in controller (" + strconv.FormatUint(gid, 10) + ")")
	}

	game := c.ToGame[gid]
	delete(game.ToPlayer, uid)
	return nil
}

// Return the underlying channel for a player so callers can get updates.
func (c *Controller) Undispatch(gid uint64, uid uint64) (chan interface{}, error) {
	c.lock.Lock()
	defer c.lock.Unlock()

	if !c.GameExists(gid) {
		return nil, errors.New("game with specified id (" + strconv.FormatUint(gid, 10) + ") doesn't exist in controller; possible double delete")
	}

	if !c.PlayerExists(gid, uid) {
		return nil, errors.New("player with specified id (" + strconv.FormatUint(uid, 10) + ") does not exists in controller (" + strconv.FormatUint(gid, 10) + ")")
	}

	game := c.ToGame[gid]

	game.lock.Lock()
	defer game.lock.Unlock()

	player := game.ToPlayer[uid]
	return player.Notifications, nil
}

func parseMessageHeader(message []byte) (MessageHeader, error) {
	var obj MessageHeader

	if err := json.Unmarshal(message, &obj); err != nil {
		return obj, err
	}

	return obj, nil
}

func (c *Controller) Dispatch(message []byte, gid uint64, uid uint64) (bool, error) {
	var header MessageHeader
	var err error

	header, err = parseMessageHeader(message)
	if err != nil {
		return false, err
	}

	if !GameModeFromString(header.Mode).IsValid() {
		return false, errors.New("unknown game mode")
	}

	if header.ID != gid {
		return false, errors.New("phantom message: message came over wrong websocket for different game: " + strconv.FormatUint(uid, 10) + " in " + strconv.FormatUint(gid, 10) + " :: " + string(message))
	}

	if header.Player != uid {
		return false, errors.New("phantom message: message came over wrong websocket for different player: " + strconv.FormatUint(uid, 10) + " in " + strconv.FormatUint(gid, 10) + " :: " + string(message))
	}

	// We're going to release this lock right away, so don't bother with
	// a defer unlock call.
	c.lock.Lock()

	gameData, ok := c.ToGame[header.ID]
	if !ok || gameData.State == nil {
		c.lock.Unlock()
		return false, errors.New("unable to find game by id (" + strconv.FormatUint(header.ID, 10) + ")")
	}

	gameData.lock.Lock()
	defer gameData.lock.Unlock()

	// Because we're not going to be accessing the controller any more,
	// and only referencing the game, release this lock.
	c.lock.Unlock()

	var was_started = gameData.State.IsStarted()
	var was_finished = gameData.State.IsFinished()

	if gameData.Mode.String() != header.Mode {
		return false, errors.New("game modes don't match internal expectations")
	}

	playerData, ok := gameData.ToPlayer[header.Player]
	if !ok {
		return false, errors.New("user (" + strconv.FormatUint(header.Player, 10) + ") isn't playing this game (" + strconv.FormatUint(header.ID, 10) + ")")
	}

	var db_msg = database.GameMessage{
		UserID:    header.Player,
		GameID:    header.ID,
		Timestamp: time.Now(),
		Message:   string(message),
	}
	playerData.InboundMsgs = append(playerData.InboundMsgs, &db_msg)

	err = c.dispatch(message, header, gameData, playerData)
	if err != nil {
		// There was an error handling this action. Send the error to the client.
		var notification ControllerNotifyError
		notification.LoadFromController(gameData, playerData, err)
		notification.ReplyTo = header.MessageID

		c.undispatch(gameData, playerData, notification.MessageID, notification.ReplyTo, notification)
	}

	var do_update = gameData.State.IsStarted() != was_started || gameData.State.IsFinished() != was_finished
	return do_update, err
}
