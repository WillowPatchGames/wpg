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
	cnaj.Timestamp = uint64(time.Now().Unix())

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
	cjna.Timestamp = uint64(time.Now().Unix())
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
	cne.Timestamp = uint64(time.Now().Unix())

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
	cns.Timestamp = uint64(time.Now().Unix())
}
