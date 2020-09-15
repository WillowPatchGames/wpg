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
	// they start with admitted = false, requring an admin to admit them, unless
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

	// InboundReplies maps indentifiers in InboundMsgs to identifiers in
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
// into game specific commands understood by a game implementation.
type Controller struct {
	lock   sync.Mutex
	ToGame map[uint64]GameData `json:"games"`
}

func (c *Controller) Init() {
	c.ToGame = make(map[uint64]GameData)
}

func (c *Controller) GameExists(gid uint64) bool {
	_, ok := c.ToGame[gid]
	return ok
}

func (c *Controller) AddGame(modeRepr string, gid uint64, owner uint64, config interface{}) error {
	if c.GameExists(gid) {
		return errors.New("game with specified id already exists in controller")
	}

	var mode GameMode = GameModeFromString(modeRepr)
	if !mode.IsValid() {
		return errors.New("unknown game mode: " + modeRepr)
	}

	if mode != RushGame {
		panic("Valid but unsupported game mode: " + modeRepr)
	}

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

func (c *Controller) RemoveGame(gid uint64) error {
	c.lock.Lock()
	defer c.lock.Unlock()

	if !c.GameExists(gid) {
		return errors.New("game with specified id doesn't exist in controller; possible double delete")
	}

	delete(c.ToGame, gid)
	return nil
}

func (c *Controller) PlayerExists(gid uint64, uid uint64) bool {
	game, ok := c.ToGame[gid]
	if !ok {
		return ok
	}

	_, ok = game.ToPlayer[uid]
	return ok
}

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

func getMessageModeAndID(message []byte) (string, uint64, uint64, string, error) {
	var obj MessageHeader

	if err := json.Unmarshal(message, &obj); err != nil {
		return "", 0, 0, "", err
	}

	return obj.Mode, obj.ID, obj.Player, obj.MessageType, nil
}

func (c *Controller) Dispatch(message []byte) error {
	var mode string
	var gid uint64
	var uid uint64
	var msgType string
	var err error

	mode, gid, uid, msgType, err = getMessageModeAndID(message)
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
