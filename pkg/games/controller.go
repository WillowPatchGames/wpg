package games

import (
	"encoding/json"
	"errors"
	"log"
	"strconv"
	"sync"
	"time"
)

const (
	// Time between countdown events
	countdownDelay = 2 * time.Second
)

type PlayerData struct {
	// Identifier of the user in the internal database.
	UID uint64 `json:"user_id"`

	// Index of this player in the internal game state, because they use an
	// array of players instead of using the uid.
	Index int `json:"index"`

	// Whether or not this player has been admitted to this game. By default,
	// they start with admitted = false, requiring an admin to admit them, unless
	// they join with an individual invite link.
	Admitted bool `json:"admitted"`

	// Whether or not the player is ready for the game to begin.
	Ready bool `json:"ready"`

	// Whether or not this player is allowed to spectate while the game is going
	// on.
	Spectator bool `json:"spectator"`

	// Highest (last seen) incoming message identifier from this player.
	InboundID int `json:"last_inbound_id"`

	// Last processed message identifier from this player. This should be the
	// last consecutive identifier we've seen and successfully processed.
	InboundProcessed int `json:"last_inbound_processed"`

	// All previously seen incoming messages from this player. By using a map,
	// we can keep track of missing messages in case the connection dropped
	// and ask for them again if it is the same connection.
	InboundMsgs map[int]interface{} `json:"inbound"`

	// Highest (last issued) outbound message identifier to this player.
	OutboundID int `json:"outbound_id"`

	// Map of outbound messages to send to the player in case they ask for any
	// to be repeated.
	OutboundMsgs map[int]interface{} `json:"outbound"`

	// InboundReplies maps identifiers in InboundMsgs to identifiers in
	// OutboundMsgs to keep track of replies to individual messages. This is
	// only for messages on the client which need to be confirmed by the
	// server.
	InboundReplies map[int]int `json:"inbound_replies"`

	// OutboundReplies maps identifiers in OutboundMsgs to identifiers in
	// InboundMsgs to keep track of replies to individual messages. This is
	// only for messages sent to the client that we expect a response to.
	OutboundReplies map[int]int `json:"outbound_replies"`

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

// Common header for all inbound and outbound messages.
type MessageHeader struct {
	Mode        string `json:"game_mode"`
	ID          uint64 `json:"game_id"`
	Player      uint64 `json:"player_id"`
	MessageType string `json:"message_type"`
	MessageID   int    `json:"message_id"`
	Timestamp   uint64 `json:"timestamp"`
	ReplyTo     int    `json:"reply_to,omitempty"`
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

// Add a new game to a controller. Note that, while configuration information
// is populated, the game isn't yet started.
func (c *Controller) AddGame(modeRepr string, gid uint64, owner uint64, config interface{}) error {
	c.lock.Lock()
	defer c.lock.Unlock()

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

	c.ToGame[gid] = &GameData{
		gid,
		mode,
		owner,
		state,
		make(map[uint64]*PlayerData),
		0,
		nil,
	}

	return nil
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
func (c *Controller) AddPlayer(gid uint64, uid uint64) (bool, error) {
	c.lock.Lock()
	defer c.lock.Unlock()

	if !c.GameExists(gid) {
		return false, errors.New("game with specified id (" + strconv.FormatUint(gid, 10) + ") does not exists in controller")
	}

	game := c.ToGame[gid]

	_, present := game.ToPlayer[uid]
	if present {
		return present, nil
	}

	// By default, the owner of the game is already admitted into the game.
	var owner bool = uid == game.Owner
	game.ToPlayer[uid] = &PlayerData{
		UID:             uid,
		Index:           -1,
		Admitted:        owner,
		InboundMsgs:     make(map[int]interface{}),
		OutboundID:      1,
		OutboundMsgs:    make(map[int]interface{}),
		InboundReplies:  make(map[int]int),
		OutboundReplies: make(map[int]int),
		Notifications:   make(chan interface{}, 64),
	}

	return false, c.notifyAdmin(game, uid)
}

func (c *Controller) notifyAdmin(game *GameData, joined uint64) error {
	// Don't notify the owner that they joined. Presumably, they already know.
	if game.Owner == joined {
		return nil
	}

	var admin *PlayerData = game.ToPlayer[game.Owner]
	if admin == nil {
		return errors.New("unable to join game without a connected admin")
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
func (c *Controller) markAdmitted(gid uint64, uid uint64, admitted bool, spectator bool) error {
	// !!NO LOCK!! This should already be held elsewhere, like Dispatch.

	if !c.GameExists(gid) {
		return errors.New("game with specified id (" + strconv.FormatUint(gid, 10) + ") does not exists in controller")
	}

	if !c.PlayerExists(gid, uid) {
		return errors.New("player with specified id (" + strconv.FormatUint(uid, 10) + ") does not exists in controller (" + strconv.FormatUint(gid, 10) + ")")
	}

	game := c.ToGame[gid]
	player := game.ToPlayer[uid]

	if !admitted {
		player.Admitted = false
		player.Spectator = false
	} else {
		player.Admitted = !spectator
		player.Spectator = spectator
	}

	var notification ControllerNotifyAdmitted
	notification.LoadFromController(game, player)
	c.undispatch(game, player, notification.MessageID, 0, notification)

	return nil
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

func (c *Controller) Dispatch(message []byte) error {
	var header MessageHeader
	var err error

	header, err = parseMessageHeader(message)
	if err != nil {
		return err
	}

	if header.Mode != "rush" {
		return errors.New("unknown type of message")
	}

	c.lock.Lock()
	defer c.lock.Unlock()

	gameData, ok := c.ToGame[header.ID]
	if !ok || gameData.State == nil {
		return errors.New("unable to find game by id (" + strconv.FormatUint(header.ID, 10) + ")")
	}

	if gameData.Mode.String() != header.Mode {
		return errors.New("game modes don't match internal expectations")
	}

	playerData, ok := gameData.ToPlayer[header.Player]
	if !ok {
		return errors.New("user (" + strconv.FormatUint(header.Player, 10) + ") isn't playing this game (" + strconv.FormatUint(header.ID, 10) + ")")
	}

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
	player.OutboundMsgs[message_id] = obj

	if reply_to > 0 {
		player.InboundReplies[reply_to] = message_id
	}

	_, err := json.Marshal(obj)
	if err != nil {
		log.Println("Unable to marshal data to send to peer:", player.UID, err, obj)
		panic("Panicing due to unrecoverable error in game program: attempt to send an unmarshable object to peer")
	} else {
		player.Notifications <- obj
	}
}
