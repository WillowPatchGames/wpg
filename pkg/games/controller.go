package games

import (
	"encoding/json"
	"errors"
	"sync"
)

type PlayerData struct {
	// Identifier of the user in the internal database.
	Uid uint64 `json:"user_id"`

	// Index of this player in the internal game state, because they use an
	// array of players instead of using the uid.
	Index int `json:"index"`

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

	// The internal game state.
	State interface{} `json:"state"`

	// Mapping from database user id to player information.
	ToPlayer map[uint64]PlayerData `json:"players"`
}

type MessageHeader struct {
	Mode        string `json:"game_mode"`
	ID          uint64 `json:"game_id"`
	Player      uint64 `json:"player_id"`
	MessageType string `json:"message_type"`
	MessageID   int    `json:"message_id"`
	Timestamp   uint64 `json:"timestamp"`
	ReplyTo     int    `json:"reply_to,omitempty"`
}

// Contollers wrap game data and handle the parsing of messages from the
// websocket or other connection. dispatch.go handles the actual dispatch
// into game specific commands.
type Controller struct {
	lock   sync.Mutex
	ToGame map[uint64]GameData `json:"games"`
}

func (c *Controller) Init() {
	c.ToGame = make(map[uint64]GameData)
}

func (c *Controller) AddGame(mode_repr string, gid uint64, config interface{}) error {
	if _, ok := c.ToGame[gid]; ok {
		return errors.New("game with specified id already exists in controller")
	}

	var mode GameMode = GameModeFromString(mode_repr)
	if !mode.IsValid() {
		return errors.New("unknown game mode: " + mode_repr)
	}

	if mode != RushGame {
		panic("Valid but unsupported game mode: " + mode_repr)
	}

	var rushConfig *RushConfig = config.(*RushConfig)
	var state *RushState = new(RushState)

	if err := state.Init(*rushConfig); err != nil {
		return err
	}

	c.lock.Lock()
	defer c.lock.Unlock()

	c.ToGame[gid] = GameData{mode, state, make(map[uint64]PlayerData)}
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
	var msg_type string
	var err error

	mode, gid, uid, msg_type, err = getMessageModeAndID(message)
	if err != nil {
		return err
	}

	if mode != "rush" {
		return errors.New("unknown type of message")
	}

	game_data, ok := c.ToGame[gid]
	if !ok || game_data.State == nil {
		return errors.New("unable to find game by id")
	}

	if game_data.Mode.String() != mode {
		return errors.New("game modes don't match internal expectations")
	}

	player_data, ok := game_data.ToPlayer[uid]
	if !ok {
		return errors.New("user isn't playing this game")
	}

	return c.dispatch(message, game_data, msg_type, player_data)
}
