package room

import (
	"encoding/json"
	"log"
	"net/http"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
	"git.cipherboy.com/WillowPatchGames/wpg/internal/models"
	"git.cipherboy.com/WillowPatchGames/wpg/internal/utils"

	api_errors "git.cipherboy.com/WillowPatchGames/wpg/pkg/errors"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/auth"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/parsel"
)

type createHandlerData struct {
	OwnerID  uint64          `json:"owner"`
	Style    string          `json:"style"`
	Open     bool            `json:"open"`
	Config   *RushRoomConfig `json:"config"`
	ApiToken string          `json:"api_token,omitempty" header:"X-Auth-Token,omitempty" query:"api_token,omitempty"`
}

type createHandlerResponse struct {
	RoomID uint64 `json:"id"`
	Owner  uint64 `json:"owner"`
	Style  string `json:"style"`
	Open   bool   `json:"open"`
	Code   string `json:"code"`
}

type CreateHandler struct {
	http.Handler
	utils.HTTPRequestHandler
	parsel.Parseltongue
	auth.Authed

	req  createHandlerData
	resp createHandlerResponse
	user *models.UserModel
}

func (handle CreateHandler) GetResponse() interface{} {
	return handle.resp
}

func (handle *CreateHandler) GetObjectPointer() interface{} {
	return &handle.req
}

func (handle *CreateHandler) GetToken() string {
	return handle.req.ApiToken
}

func (handle *CreateHandler) SetUser(user *models.UserModel) {
	handle.user = user
}

func (handle CreateHandler) verifyRequest() error {
	if handle.req.OwnerID == 0 {
		handle.req.OwnerID = handle.user.Eid
	}

	if handle.req.OwnerID == 0 {
		log.Println("Missing OwnerId")
		return api_errors.ErrMissingRequest
	}

	if handle.req.Style == "" {
		log.Println("Missing style")
		return api_errors.ErrMissingRequest
	}

	return nil
}

func (handle CreateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	err := handle.verifyRequest()
	if err != nil {
		api_errors.WriteError(w, err, true)
		return
	}

	var data []byte
	data, _ = json.Marshal(handle.req)
	log.Println("Request:", string(data))

	tx, err := database.GetTransaction()
	if err != nil {
		api_errors.WriteError(w, err, true)
		return
	}

	var user models.UserModel
	err = user.FromEid(tx, handle.req.OwnerID)
	if err != nil {
		api_errors.WriteError(w, err, true)
		return
	}

	var room models.RoomModel
	room.OwnerId = user.Id
	room.Style = handle.req.Style
	room.Open = handle.req.Open

	err = room.Create(tx)
	if err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			log.Print("Unable to rollback:", rollbackErr)
		}

		api_errors.WriteError(w, err, true)
		return
	}

	log.Println("Created room")

	if handle.req.Config != nil {
		err = room.SetConfig(tx, handle.req.Config)
		if err != nil {
			if rollbackErr := tx.Rollback(); rollbackErr != nil {
				log.Print("Unable to rollback:", rollbackErr)
			}

			api_errors.WriteError(w, err, true)
			return
		}
	}

	log.Println("Set config")

	err = tx.Commit()
	if err != nil {
		api_errors.WriteError(w, err, true)
		return
	}

	handle.resp.RoomID = room.Eid
	handle.resp.Owner = user.Eid
	handle.resp.Style = room.Style
	handle.resp.Open = room.Open
	handle.resp.Code = room.JoinCode

	data, _ = json.Marshal(handle.resp)
	log.Println("Response:", string(data))

	utils.SendResponse(w, r, &handle)
}
