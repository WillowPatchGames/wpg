package games

import (
	"time"
)

type ControllerNotifyAdminJoin struct {
	MessageHeader
	Joined uint64 `json:"joined"`
}

func (cnaj *ControllerNotifyAdminJoin) LoadFromController(data *GameData, player *PlayerData, joined uint64) {
	cnaj.Mode = data.Mode.String()
	cnaj.ID = data.GID
	cnaj.Player = player.UID
	cnaj.MessageType = "notify-join"
	cnaj.MessageID = player.OutboundID
	player.OutboundID++
	cnaj.Timestamp = uint64(time.Now().UnixNano() / int64(time.Millisecond))

	cnaj.Joined = joined
}

type ControllerNotifyAdmitted struct {
	MessageHeader
}

func (cjna *ControllerNotifyAdmitted) LoadFromController(data *GameData, player *PlayerData) {
	cjna.Mode = data.Mode.String()
	cjna.ID = data.GID
	cjna.Player = player.UID
	cjna.MessageType = "admitted"
	cjna.MessageID = player.OutboundID
	player.OutboundID++
	cjna.Timestamp = uint64(time.Now().UnixNano() / int64(time.Millisecond))
}

type ControllerNotifyError struct {
	MessageHeader
	Error string `json:"error"`
}

func (cne *ControllerNotifyError) LoadFromController(data *GameData, player *PlayerData, err error) {
	cne.Mode = data.Mode.String()
	cne.ID = data.GID
	cne.Player = player.UID
	cne.MessageType = "error"
	cne.MessageID = player.OutboundID
	player.OutboundID++
	cne.Timestamp = uint64(time.Now().UnixNano() / int64(time.Millisecond))

	cne.Error = err.Error()
}

type ControllerNotifyStarted struct {
	MessageHeader
}

func (cns *ControllerNotifyStarted) LoadFromController(data *GameData, player *PlayerData) {
	cns.Mode = data.Mode.String()
	cns.ID = data.GID
	cns.Player = player.UID
	cns.MessageType = "started"
	cns.MessageID = player.OutboundID
	player.OutboundID++
	cns.Timestamp = uint64(time.Now().UnixNano() / int64(time.Millisecond))
}

type ControllerCountdown struct {
	MessageHeader
	Value int `json:"value"`
}

func (cc *ControllerCountdown) LoadFromController(data *GameData, player *PlayerData) {
	cc.Mode = data.Mode.String()
	cc.ID = data.GID
	cc.Player = player.UID
	cc.MessageType = "countdown"
	cc.MessageID = player.OutboundID
	player.OutboundID++
	cc.Timestamp = uint64(time.Now().UnixNano() / int64(time.Millisecond))
	cc.Value = data.Countdown
}
