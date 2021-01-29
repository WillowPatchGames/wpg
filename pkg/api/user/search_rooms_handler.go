package user

import (
	"errors"
	"net/http"
	"time"

	"gorm.io/gorm"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
	"git.cipherboy.com/WillowPatchGames/wpg/internal/utils"

	"git.cipherboy.com/WillowPatchGames/wpg/pkg/api"
	api_errors "git.cipherboy.com/WillowPatchGames/wpg/pkg/errors"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/auth"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/hwaterr"
)

type SearchRoomsHandlerData struct {
	UserID    uint64 `json:"id,omitempty" query:"id,omitempty" route:"UserID,omitempty"`
	Username  string `json:"username,omitempty" query:"username,omitempty" route:"Username,omitempty"`
	Email     string `json:"email,omitempty" query:"email,omitempty" route:"Email,omitempty"`
	Lifecycle string `json:"lifecycle,omitempty" query:"lifecycle,omitempty" route:"Lifecycle,omitempty"`
	APIToken  string `json:"api_token,omitempty" header:"X-Auth-Token,omitempty" query:"api_token,omitempty"`
}

type SearchRoomsHandlerResponse struct {
	OwnerID   uint64    `json:"owner_id"`
	RoomID    uint64    `json:"room_id"`
	Style     string    `json:"style"`
	Lifecycle string    `json:"lifecycle"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type SearchRoomsHandler struct {
	auth.Authed
	hwaterr.ErrableHandler
	utils.HTTPRequestHandler

	req  SearchRoomsHandlerData
	resp []SearchRoomsHandlerResponse
	user *database.User
}

func (handle SearchRoomsHandler) GetResponse() interface{} {
	return handle.resp
}

func (handle *SearchRoomsHandler) GetObjectPointer() interface{} {
	return &handle.req
}

func (handle *SearchRoomsHandler) GetToken() string {
	return handle.req.APIToken
}

func (handle *SearchRoomsHandler) SetUser(user *database.User) {
	handle.user = user
}

func (handle SearchRoomsHandler) verifyRequest() error {
	var present int = 0

	if handle.req.UserID != 0 {
		present++
	}
	if handle.req.Username != "" {
		present++
	}
	if handle.req.Email != "" {
		present++
	}

	if present == 0 && handle.user != nil && handle.user.ID != 0 {
		present++
	}

	if present == 0 {
		return api_errors.ErrMissingRequest
	}

	if present > 1 {
		return api_errors.ErrTooManySpecifiers
	}

	err := api.ValidateUsername(handle.req.Username)
	if err != nil {
		return err
	}

	err = api.ValidateEmail(handle.req.Email)
	if err != nil {
		return err
	}

	if handle.req.Lifecycle != "" && handle.req.Lifecycle != "pending" && handle.req.Lifecycle != "playing" && handle.req.Lifecycle != "finished" && handle.req.Lifecycle != "deleted" {
		return api_errors.ErrBadValue
	}

	return nil
}

func (handle *SearchRoomsHandler) ServeErrableHTTP(w http.ResponseWriter, r *http.Request) error {
	err := handle.verifyRequest()
	if err != nil {
		return hwaterr.WrapError(err, http.StatusBadRequest)
	}

	if handle.req.UserID != 0 && handle.req.UserID != handle.user.ID {
		return hwaterr.WrapError(api_errors.ErrAccessDenied, http.StatusUnauthorized)
	}

	if handle.req.Username != "" && (!handle.user.Username.Valid || handle.req.Username != handle.user.Username.String) {
		return hwaterr.WrapError(api_errors.ErrAccessDenied, http.StatusUnauthorized)
	}

	if handle.req.Email != "" && (!handle.user.Email.Valid || handle.req.Email != handle.user.Email.String) {
		return hwaterr.WrapError(api_errors.ErrAccessDenied, http.StatusUnauthorized)
	}

	if err := database.InTransaction(func(tx *gorm.DB) error {
		query := tx.Model(&database.RoomMember{}).Where("room_members.user_id = ? AND room_members.admitted = ?", handle.user.ID, true)
		query = query.Joins("LEFT JOIN rooms ON room_members.room_id = rooms.id")
		if handle.req.Lifecycle != "" {
			query = query.Where("rooms.lifecycle = ?", handle.req.Lifecycle)
		}
		query = query.Order("rooms.id DESC")
		query = query.Select("rooms.id")

		var room_ids []uint64
		if err = query.Find(&room_ids).Error; err != nil {
			return err
		}

		for _, room_id := range room_ids {
			var room database.Room
			if err := tx.First(&room, room_id).Error; err != nil {
				return err
			}

			handle.resp = append(handle.resp, SearchRoomsHandlerResponse{
				OwnerID: room.OwnerID,
				RoomID:  room.ID,
				Style:   room.Style,
				// Lifecycle: room.Lifecycle,
				Lifecycle: "playing",
				CreatedAt: room.CreatedAt,
				UpdatedAt: room.UpdatedAt,
			})
		}

		return nil
	}); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return hwaterr.WrapError(err, http.StatusNotFound)
		}

		return err
	}

	utils.SendResponse(w, r, handle)
	return nil
}
