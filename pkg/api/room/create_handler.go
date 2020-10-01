package room

import (
	"encoding/json"
	"log"
	"net/http"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
	"git.cipherboy.com/WillowPatchGames/wpg/internal/utils"

	api_errors "git.cipherboy.com/WillowPatchGames/wpg/pkg/errors"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/auth"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/hwaterr"
)

type createHandlerData struct {
	OwnerID  uint64          `json:"owner"`
	Style    string          `json:"style"`
	Open     bool            `json:"open"`
	Config   *RushRoomConfig `json:"config"`
	APIToken string          `json:"api_token,omitempty" header:"X-Auth-Token,omitempty" query:"api_token,omitempty"`
}

type createHandlerResponse struct {
	RoomID uint64 `json:"id"`
	Owner  uint64 `json:"owner"`
	Style  string `json:"style"`
	Open   bool   `json:"open"`
	Code   string `json:"code"`
}

type CreateHandler struct {
	auth.Authed
	hwaterr.ErrableHandler
	utils.HTTPRequestHandler

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
	return handle.req.APIToken
}

func (handle *CreateHandler) SetUser(user *models.UserModel) {
	handle.user = user
}

func (handle CreateHandler) verifyRequest() error {
	if handle.req.OwnerID == 0 {
		handle.req.OwnerID = handle.user.ID
	}

	if handle.req.OwnerID == 0 {
		log.Println("Missing OwnerID")
		return api_errors.ErrMissingRequest
	}

	if handle.req.Style == "" {
		log.Println("Missing style")
		return api_errors.ErrMissingRequest
	}

	return nil
}

func (handle CreateHandler) ServeErrableHTTP(w http.ResponseWriter, r *http.Request) error {
	err := handle.verifyRequest()
	if err != nil {
		return hwaterr.WrapError(err, http.StatusBadRequest)
	}

	var data []byte
	data, _ = json.Marshal(handle.req)
	log.Println("Request:", string(data))

	tx, err := database.GetTransaction()
	if err != nil {
		return err
	}

	var user models.UserModel
	err = user.FromID(tx, handle.req.OwnerID)
	if err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			log.Print("Unable to rollback:", rollbackErr)
		}

		return err
	}

	var room models.RoomModel
	room.OwnerID = user.ID
	room.Style = handle.req.Style
	room.Open = handle.req.Open

	err = room.Create(tx)
	if err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			log.Print("Unable to rollback:", rollbackErr)
		}

		return err
	}

	log.Println("Created room")

	if handle.req.Config != nil {
		err = room.SetConfig(tx, handle.req.Config)
		if err != nil {
			if rollbackErr := tx.Rollback(); rollbackErr != nil {
				log.Print("Unable to rollback:", rollbackErr)
			}

			return err
		}
	}

	log.Println("Set config")

	err = tx.Commit()
	if err != nil {
		return err
	}

	handle.resp.RoomID = room.ID
	handle.resp.Owner = user.ID
	handle.resp.Style = room.Style
	handle.resp.Open = room.Open
	handle.resp.Code = room.JoinCode

	data, _ = json.Marshal(handle.resp)
	log.Println("Response:", string(data))

	utils.SendResponse(w, r, &handle)
	return nil
}
