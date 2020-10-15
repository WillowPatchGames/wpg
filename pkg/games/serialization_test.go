package games

import (
	"encoding/json"
	"testing"
)

func TestRoundtripStructs(t *testing.T) {
	var data []byte
	var err error

	var pd PlayerData
	data, err = json.Marshal(pd)
	if err != nil {
		panic(err)
	}
	if err = json.Unmarshal(data, &pd); err != nil {
		panic(err)
	}

	var gd *GameData = &GameData{}
	data, err = json.Marshal(gd)
	if err != nil {
		panic(err)
	}
	if err = json.Unmarshal(data, gd); err != nil {
		panic(err)
	}

	var mh MessageHeader
	data, err = json.Marshal(mh)
	if err != nil {
		panic(err)
	}
	if err = json.Unmarshal(data, &mh); err != nil {
		panic(err)
	}

	var cnaj ControllerNotifyAdminJoin
	data, err = json.Marshal(cnaj)
	if err != nil {
		panic(err)
	}
	if err = json.Unmarshal(data, &cnaj); err != nil {
		panic(err)
	}

	var cna ControllerNotifyAdmitted
	data, err = json.Marshal(cna)
	if err != nil {
		panic(err)
	}
	if err = json.Unmarshal(data, &cna); err != nil {
		panic(err)
	}

	var cne ControllerNotifyError
	data, err = json.Marshal(cne)
	if err != nil {
		panic(err)
	}
	if err = json.Unmarshal(data, &cne); err != nil {
		panic(err)
	}

	var cns ControllerNotifyStarted
	data, err = json.Marshal(cns)
	if err != nil {
		panic(err)
	}
	if err = json.Unmarshal(data, &cns); err != nil {
		panic(err)
	}

	var cc ControllerCountdown
	data, err = json.Marshal(cc)
	if err != nil {
		panic(err)
	}
	if err = json.Unmarshal(data, &cc); err != nil {
		panic(err)
	}

	var cnw ControllerNotifyWord
	data, err = json.Marshal(cnw)
	if err != nil {
		panic(err)
	}
	if err = json.Unmarshal(data, &cnw); err != nil {
		panic(err)
	}

	var cps ControllerPlayerState
	data, err = json.Marshal(cps)
	if err != nil {
		panic(err)
	}
	if err = json.Unmarshal(data, &cps); err != nil {
		panic(err)
	}

	var cluig ControllerListUsersInGame
	data, err = json.Marshal(cluig)
	if err != nil {
		panic(err)
	}
	if err = json.Unmarshal(data, &cluig); err != nil {
		panic(err)
	}

	var ga GameAdmit
	data, err = json.Marshal(ga)
	if err != nil {
		panic(err)
	}
	if err = json.Unmarshal(data, &ga); err != nil {
		panic(err)
	}

	var gr GameReady
	data, err = json.Marshal(gr)
	if err != nil {
		panic(err)
	}
	if err = json.Unmarshal(data, &gr); err != nil {
		panic(err)
	}

	var giw GameIsWord
	data, err = json.Marshal(giw)
	if err != nil {
		panic(err)
	}
	if err = json.Unmarshal(data, &giw); err != nil {
		panic(err)
	}

	var gc GameCountback
	data, err = json.Marshal(gc)
	if err != nil {
		panic(err)
	}
	if err = json.Unmarshal(data, &gc); err != nil {
		panic(err)
	}

	var rdraw RushDraw
	data, err = json.Marshal(rdraw)
	if err != nil {
		panic(err)
	}
	if err = json.Unmarshal(data, &rdraw); err != nil {
		panic(err)
	}

	var rdiscard RushDiscard
	data, err = json.Marshal(rdiscard)
	if err != nil {
		panic(err)
	}
	if err = json.Unmarshal(data, &rdiscard); err != nil {
		panic(err)
	}

	var rr RushRecall
	data, err = json.Marshal(rr)
	if err != nil {
		panic(err)
	}
	if err = json.Unmarshal(data, &rr); err != nil {
		panic(err)
	}

	var rswap RushSwap
	data, err = json.Marshal(rswap)
	if err != nil {
		panic(err)
	}
	if err = json.Unmarshal(data, &rswap); err != nil {
		panic(err)
	}

	var rm RushMove
	data, err = json.Marshal(rm)
	if err != nil {
		panic(err)
	}
	if err = json.Unmarshal(data, &rm); err != nil {
		panic(err)
	}

	var rplay RushPlay
	data, err = json.Marshal(rplay)
	if err != nil {
		panic(err)
	}
	if err = json.Unmarshal(data, &rplay); err != nil {
		panic(err)
	}

	var rpstate RushPlayerState
	data, err = json.Marshal(rpstate)
	if err != nil {
		panic(err)
	}
	if err = json.Unmarshal(data, &rpstate); err != nil {
		panic(err)
	}

	var rgs RushGameState
	data, err = json.Marshal(rgs)
	if err != nil {
		panic(err)
	}
	if err = json.Unmarshal(data, &rgs); err != nil {
		panic(err)
	}

	var rstaten RushStateNotification
	data, err = json.Marshal(rstaten)
	if err != nil {
		panic(err)
	}
	if err = json.Unmarshal(data, &rstaten); err != nil {
		panic(err)
	}

	var rpsynopsis RushPlayerSynopsis
	data, err = json.Marshal(rpsynopsis)
	if err != nil {
		panic(err)
	}
	if err = json.Unmarshal(data, &rpsynopsis); err != nil {
		panic(err)
	}

	var rsynopsisn RushSynopsisNotification
	data, err = json.Marshal(rsynopsisn)
	if err != nil {
		panic(err)
	}
	if err = json.Unmarshal(data, &rsynopsisn); err != nil {
		panic(err)
	}

	var rdn RushDrawNotification
	data, err = json.Marshal(rdn)
	if err != nil {
		panic(err)
	}
	if err = json.Unmarshal(data, &rdn); err != nil {
		panic(err)
	}

	var rcn RushCheckNotification
	data, err = json.Marshal(rcn)
	if err != nil {
		panic(err)
	}
	if err = json.Unmarshal(data, &rcn); err != nil {
		panic(err)
	}

	var rfn RushFinishedNotification
	data, err = json.Marshal(rfn)
	if err != nil {
		panic(err)
	}
	if err = json.Unmarshal(data, &rfn); err != nil {
		panic(err)
	}

	var rgsn RushGameStateNotification
	data, err = json.Marshal(rgsn)
	if err != nil {
		panic(err)
	}
	if err = json.Unmarshal(data, &rgsn); err != nil {
		panic(err)
	}

	var rplayer RushPlayer
	data, err = json.Marshal(rplayer)
	if err != nil {
		panic(err)
	}
	if err = json.Unmarshal(data, &rplayer); err != nil {
		panic(err)
	}

	var rc RushConfig
	data, err = json.Marshal(rc)
	if err != nil {
		panic(err)
	}
	if err = json.Unmarshal(data, &rc); err != nil {
		panic(err)
	}

	var rstate RushState
	data, err = json.Marshal(rstate)
	if err != nil {
		panic(err)
	}
	if err = json.Unmarshal(data, &rstate); err != nil {
		panic(err)
	}

	var lt LetterTile
	data, err = json.Marshal(lt)
	if err != nil {
		panic(err)
	}
	if err = json.Unmarshal(data, &lt); err != nil {
		panic(err)
	}

	var lp LetterPos
	data, err = json.Marshal(lp)
	if err != nil {
		panic(err)
	}
	if err = json.Unmarshal(data, &lp); err != nil {
		panic(err)
	}

	var lg LetterGrid
	data, err = json.Marshal(lg)
	if err != nil {
		panic(err)
	}
	if err = json.Unmarshal(data, &lg); err != nil {
		panic(err)
	}
}
