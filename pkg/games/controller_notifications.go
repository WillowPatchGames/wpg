package games

import (
	"time"
)

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

func (mh *MessageHeader) LoadHeader(data *GameData, player *PlayerData) {
	mh.Mode = data.Mode.String()
	mh.ID = data.GID
	mh.Player = player.UID
	mh.MessageID = player.OutboundID
	player.OutboundID++
	mh.Timestamp = uint64(time.Now().UnixNano() / int64(time.Millisecond))
}

type ControllerNotifyAdminJoin struct {
	MessageHeader
	Joined   uint64 `json:"joined"`
	Admitted bool   `json:"admitted"`
	Playing  bool   `json:"playing"`
	Ready    bool   `json:"ready"`
}

func (cnaj *ControllerNotifyAdminJoin) LoadFromController(data *GameData, player *PlayerData, joined *PlayerData) {
	cnaj.LoadHeader(data, player)
	cnaj.MessageType = "notify-join"

	cnaj.Joined = joined.UID
	cnaj.Admitted = joined.Admitted
	cnaj.Playing = joined.Playing
	cnaj.Ready = joined.Ready
}

type ControllerNotifyAdminCountback struct {
	MessageHeader
	Joined    uint64 `json:"joined"`
	Connected bool   `json:"connected"`
}

func (cnac *ControllerNotifyAdminCountback) LoadFromController(data *GameData, player *PlayerData, joined *PlayerData) {
	cnac.LoadHeader(data, player)
	cnac.MessageType = "notify-countback"

	cnac.Joined = joined.UID
	cnac.Connected = true
}

type ControllerNotifyAdmitted struct {
	MessageHeader

	Admitted bool `json:"admitted"`
	Playing  bool `json:"playing"`
	Ready    bool `json:"ready"`
}

func (cna *ControllerNotifyAdmitted) LoadFromController(data *GameData, player *PlayerData) {
	cna.LoadHeader(data, player)
	cna.MessageType = "admitted"

	cna.Admitted = player.Admitted
	cna.Playing = player.Playing
	cna.Ready = player.Ready
}

type ControllerNotifyError struct {
	MessageHeader
	Error string `json:"error"`
}

func (cne *ControllerNotifyError) LoadFromController(data *GameData, player *PlayerData, err error) {
	cne.LoadHeader(data, player)
	cne.MessageType = "error"

	cne.Error = err.Error()
}

type ControllerNotifyStarted struct {
	MessageHeader
	Playing bool `json:"playing"`
}

func (cns *ControllerNotifyStarted) LoadFromController(data *GameData, player *PlayerData) {
	cns.LoadHeader(data, player)
	cns.MessageType = "started"

	cns.Playing = player.Playing
}

type ControllerCountdown struct {
	MessageHeader
	Value int `json:"value"`
}

func (cc *ControllerCountdown) LoadFromController(data *GameData, player *PlayerData) {
	cc.LoadHeader(data, player)
	cc.MessageType = "countdown"

	cc.Value = data.Countdown
}

type ControllerKeepAlive struct {
	MessageHeader
}

func (cka *ControllerKeepAlive) LoadFromController(data *GameData, player *PlayerData) {
	cka.LoadHeader(data, player)
	cka.MessageType = "keepalive"
}

type ControllerNotifyWord struct {
	MessageHeader
	Word  string `json:"word"`
	Valid bool   `json:"valid"`
}

func (cnw *ControllerNotifyWord) LoadFromController(data *GameData, player *PlayerData, word string) {
	cnw.LoadHeader(data, player)
	cnw.MessageType = "countdown"

	cnw.Word = word
	cnw.Valid = IsWord(word)
}

type ControllerPlayerState struct {
	UID     uint64 `json:"user"`
	Playing bool   `json:"playing"`
	Ready   bool   `json:"ready"`
}

type ControllerListUsersInGame struct {
	MessageHeader

	Players []ControllerPlayerState `json:"players"`
}

func (cluig *ControllerListUsersInGame) LoadFromController(data *GameData, player *PlayerData) {
	cluig.LoadHeader(data, player)
	cluig.MessageType = "notify-users"

	for _, indexed_player := range data.ToPlayer {
		if indexed_player.Admitted {
			var state ControllerPlayerState
			state.UID = indexed_player.UID
			state.Playing = indexed_player.Playing
			state.Ready = indexed_player.Ready

			cluig.Players = append(cluig.Players, state)
		}
	}
}
