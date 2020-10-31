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
)

const (
	// Time between countdown events
	countdownDelay = 2 * time.Second

	// Size of the notification queue for a player, number of messages.
	notificationQueueLength = 1024
)

type PlayerData struct {
	// Identifier of the user in the internal database.
	UID uint64 `json:"user_id"`

	// Index of this player in the internal game state, because they use an
	// array of players instead of using the uid.
	Index int `json:"index"`

	// Whether or not this player has been admitted to this game. This lets them
	// see notifications about the game.
	Admitted bool `json:"admitted"`

	// Whether or not this player is playing the game or is a spectator.
	Playing bool `json:"playing"`

	// Whether or not the player is ready for the game to begin.
	Ready bool `json:"ready"`

	// All previously seen incoming messages from this player to the server.
	InboundMsgs []*database.GameMessage `json:"-"`

	// Highest (last issued) outbound message identifier to this player.
	OutboundID int `json:"outbound_id"`

	// All previously sent messages from the server to this player.
	OutboundMsgs []*database.GameMessage `json:"-"`

	// When the game is starting, we do a full round-trip for countdown events.
	// This ensures that everyone listening is actively participating and that
	// nobody is missing.
	Countback int `json:"countdown"`

	// Notifications to undispatch. Once processed above, data can be queued here
	// until Undispatch is called by the Websocket. This isn't persisted as we
	// don't need to access it.
	Notifications chan interface{} `json:"-"`
}

type GameData struct {
	// Lock for doing operations on the game data.
	lock sync.Mutex

	// Identifier of the game in the internal database.
	GID uint64 `json:"game_id"`

	// What type of game this is.
	Mode GameMode `json:"mode"`

	// Who the owner of this game is.
	Owner uint64 `json:"owner"`

	// The internal game state.
	State interface{} `json:"state"`

	// Mapping from database user id to player information.
	ToPlayer map[uint64]*PlayerData `json:"players"`

	// When starting the game and using a countdown, the current value of the
	// countdown.
	Countdown int `json:"countdown"`

	// Timer to ensure we delay between countdown events.
	CountdownTimer *time.Timer `json:"-"`
}

// Controller wraps game data and handles the parsing of messages from the
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
	data.State = new(RushState)

	if gamedb.State.Valid {
		if err := json.Unmarshal([]byte(gamedb.State.String), &data); err != nil {
			return err
		}
	}

	if data.GID != gamedb.ID {
		// Assume this game hasn't yet been initialized. Create a new game and then
		// persist it back to the database.
		var config RushConfig

		if !gamedb.Config.Valid {
			return errors.New("got unexpectedly empty game configuration")
		}

		if err := json.Unmarshal([]byte(gamedb.Config.String), &config); err != nil {
			return err
		}

		// Add and initialize a new game object.
		if err := c.addGame(gamedb.Style, gamedb.ID, gamedb.OwnerID, &config); err != nil {
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

	var state *RushState = c.ToGame[gamedb.ID].State.(*RushState)
	if state != nil {
		if err := state.ReInit(); err != nil {
			return err
		}
	}

	return nil
}

// Add a new game to a controller. Note that, while configuration information
// is populated, the game isn't yet started.
func (c *Controller) addGame(modeRepr string, gid uint64, owner uint64, config interface{}) error {
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

	if mode != RushGame {
		// XXX: Remove me once more game modes are supported.
		panic("Valid but unsupported game mode: " + modeRepr)
	}

	// Type assert to grab the configuration.
	var rushConfig *RushConfig = config.(*RushConfig)
	var state *RushState = new(RushState)

	if err := state.Init(*rushConfig); err != nil {
		return err
	}

	game := new(GameData)
	game.lock = sync.Mutex{}
	game.GID = gid
	game.Mode = mode
	game.Owner = owner
	game.State = state
	game.ToPlayer = make(map[uint64]*PlayerData)
	game.Countdown = 0
	game.CountdownTimer = nil

	c.ToGame[gid] = game

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
	var err error
	if game.State != nil {
		var state *RushState = game.State.(*RushState)
		var config = state.Config

		encoded, err = json.Marshal(config)
		if err != nil {
			c.lock.Unlock()
			return err
		}

		if gamedb.Lifecycle != "deleted" {
			if !state.Started {
				gamedb.Lifecycle = "pending"
			} else if state.Started && !state.Finished {
				gamedb.Lifecycle = "playing"
			} else {
				gamedb.Lifecycle = "finished"
			}
		} else {
			state.Started = false
			state.Finished = false
		}
	}

	encoded_state, err := json.Marshal(game)
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

	if err := tx.Model(gamedb).Update("Config", string(encoded)).Error; err != nil {
		return err
	}

	if err := tx.Model(gamedb).Update("State", string(encoded_state)).Error; err != nil {
		return err
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

func (c *Controller) notifyAdmin(game *GameData, uid uint64) error {
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
	// !!NO LOCK!! This should already be held elsewhere, like Dispatch.

	if !c.GameExists(gid) {
		return errors.New("game with specified id (" + strconv.FormatUint(gid, 10) + ") does not exists in controller")
	}

	if !c.PlayerExists(gid, uid) {
		return errors.New("player with specified id (" + strconv.FormatUint(uid, 10) + ") does not exists in controller for game (" + strconv.FormatUint(gid, 10) + ")")
	}

	game := c.ToGame[gid]
	player := game.ToPlayer[uid]
	player.Ready = ready
	return nil
}

// Mark a player as being admitted to the game. This should be controlled by
// the game admin and not the players themselves. The exception to this is
// that users joining by individual invite tokens should be auto-admitted as
// they were previously invited individually.
func (c *Controller) markAdmitted(gid uint64, uid uint64, admitted bool, playing bool) error {
	// !!NO LOCK!! This should already be held elsewhere, like Dispatch.

	if !c.GameExists(gid) {
		return errors.New("game with specified id (" + strconv.FormatUint(gid, 10) + ") does not exists in controller")
	}

	if !c.PlayerExists(gid, uid) {
		return errors.New("player with specified id (" + strconv.FormatUint(uid, 10) + ") does not exists in controller (" + strconv.FormatUint(gid, 10) + ")")
	}

	game := c.ToGame[gid]
	player := game.ToPlayer[uid]

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

func (c *Controller) Dispatch(message []byte, gid uint64, uid uint64) error {
	var header MessageHeader
	var err error

	header, err = parseMessageHeader(message)
	if err != nil {
		return err
	}

	if header.Mode != "rush" {
		return errors.New("unknown type of message")
	}

	if header.ID != gid {
		return errors.New("phantom message: message came over wrong websocket for different game: " + strconv.FormatUint(uid, 10) + " in " + strconv.FormatUint(gid, 10) + " :: " + string(message))
	}

	if header.Player != uid {
		return errors.New("phantom message: message came over wrong websocket for different player: " + strconv.FormatUint(uid, 10) + " in " + strconv.FormatUint(gid, 10) + " :: " + string(message))
	}

	// We're going to release this lock right away, so don't bother with
	// a defer unlock call.
	c.lock.Lock()

	gameData, ok := c.ToGame[header.ID]
	if !ok || gameData.State == nil {
		c.lock.Unlock()
		return errors.New("unable to find game by id (" + strconv.FormatUint(header.ID, 10) + ")")
	}

	gameData.lock.Lock()
	defer gameData.lock.Unlock()

	// Because we're not going to be accessing the controller any more,
	// and only referencing the game, release this lock.
	c.lock.Unlock()

	if gameData.Mode.String() != header.Mode {
		return errors.New("game modes don't match internal expectations")
	}

	playerData, ok := gameData.ToPlayer[header.Player]
	if !ok {
		return errors.New("user (" + strconv.FormatUint(header.Player, 10) + ") isn't playing this game (" + strconv.FormatUint(header.ID, 10) + ")")
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

	return err
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
