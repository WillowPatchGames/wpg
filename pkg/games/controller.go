package games

import (
	"encoding/json"
	"errors"
	"sync"
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
}

type GameData struct {
	// What type of game this is.
	Mode GameMode `json:"mode"`

	// Who the owner of this game is.
	Owner uint64 `json:"owner"`

	// The internal game state.
	State interface{} `json:"state"`

	// Mapping from database user id to player information.
	ToPlayer map[uint64]PlayerData `json:"players"`
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
	ToGame map[uint64]GameData `json:"games"`
}

// Initialize a Controller object.
func (c *Controller) Init() {
	// Locks don't need to be initialized.
	c.ToGame = make(map[uint64]GameData)
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
	// If the game exists, throw an error.
	if c.GameExists(gid) {
		return errors.New("game with specified id already exists in controller")
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

	c.lock.Lock()
	defer c.lock.Unlock()

	c.ToGame[gid] = GameData{
		mode,
		owner,
		state,
		make(map[uint64]PlayerData),
	}

	return nil
}

// Remove a given game once it is no longer needed.
func (c *Controller) RemoveGame(gid uint64) error {
	c.lock.Lock()
	defer c.lock.Unlock()

	if !c.GameExists(gid) {
		return errors.New("game with specified id doesn't exist in controller; possible double delete")
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
		return false, errors.New("game with specified id does not exists in controller")
	}

	game := c.ToGame[gid]

	_, present := game.ToPlayer[uid]
	if present {
		return present, nil
	}

	// By default, the owner of the game is already admitted into the game.
	var owner bool = uid == game.Owner
	game.ToPlayer[uid] = PlayerData{
		UID:             uid,
		Admitted:        owner,
		InboundMsgs:     make(map[int]interface{}),
		OutboundMsgs:    make(map[int]interface{}),
		InboundReplies:  make(map[int]int),
		OutboundReplies: make(map[int]int),
	}

	return false, nil
}

// Mark a player as being ready to play. This can and should be controlled
// by the player and not by a game admin.
func (c *Controller) MarkReady(gid uint64, uid uint64, ready bool) error {
	c.lock.Lock()
	defer c.lock.Unlock()

	if !c.GameExists(gid) {
		return errors.New("game with specified id does not exists in controller")
	}

	if !c.PlayerExists(gid, uid) {
		return errors.New("game with specified id does not exists in controller")
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
func (c *Controller) MarkAdmitted(gid uint64, uid uint64, admitted bool) error {
	c.lock.Lock()
	defer c.lock.Unlock()

	if !c.GameExists(gid) {
		return errors.New("game with specified id does not exists in controller")
	}

	if !c.PlayerExists(gid, uid) {
		return errors.New("game with specified id does not exists in controller")
	}

	game := c.ToGame[gid]
	player := game.ToPlayer[uid]
	player.Admitted = admitted
	return nil
}

func getMessageModeAndID(message []byte) (MessageHeader, error) {
	var obj MessageHeader

	if err := json.Unmarshal(message, &obj); err != nil {
		return obj, err
	}

	return obj, nil
}

func (c *Controller) Dispatch(message []byte) error {
	var obj MessageHeader
	var err error

	obj, err = getMessageModeAndID(message)
	if err != nil {
		return err
	}

	if mode != "rush" {
		return errors.New("unknown type of message")
	}

	gameData, ok := c.ToGame[gid]
	if !ok || gameData.State == nil {
		return errors.New("unable to find game by id")
	}

	if gameData.Mode.String() != mode {
		return errors.New("game modes don't match internal expectations")
	}

	playerData, ok := gameData.ToPlayer[uid]
	if !ok {
		return errors.New("user isn't playing this game")
	}

	return c.dispatch(message, gameData, msgType, playerData)
}
