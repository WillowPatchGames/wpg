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

type SearchGamesHandlerData struct {
	UserID    uint64 `json:"id,omitempty" query:"id,omitempty" route:"UserID,omitempty"`
	Username  string `json:"username,omitempty" query:"username,omitempty" route:"Username,omitempty"`
	Email     string `json:"email,omitempty" query:"email,omitempty" route:"Email,omitempty"`
	APIToken  string `json:"api_token,omitempty" header:"X-Auth-Token,omitempty" query:"api_token,omitempty"`
	Lifecycle string `json:"lifecycle,omitempty" query:"lifecycle,omitempty" route:"Lifecycle,omitempty"`
}

type SearchGamesHandlerResponse struct {
	OwnerID   uint64    `json:"owner_id"`
	GameID    uint64    `json:"game_id"`
	Style     string    `json:"style"`
	Lifecycle string    `json:"lifecycle"`
	CreatedAt time.Time `json:"created_at"`
}

type SearchGamesHandler struct {
	auth.Authed
	hwaterr.ErrableHandler
	utils.HTTPRequestHandler

	req  SearchGamesHandlerData
	resp []SearchGamesHandlerResponse
	user *database.User
}

func (handle SearchGamesHandler) GetResponse() interface{} {
	return handle.resp
}

func (handle *SearchGamesHandler) GetObjectPointer() interface{} {
	return &handle.req
}

func (handle *SearchGamesHandler) GetToken() string {
	return handle.req.APIToken
}

func (handle *SearchGamesHandler) SetUser(user *database.User) {
	handle.user = user
}

func (handle SearchGamesHandler) verifyRequest() error {
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

func (handle *SearchGamesHandler) ServeErrableHTTP(w http.ResponseWriter, r *http.Request) error {
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
		query := tx.Model(&database.GamePlayer{}).Where("game_players.user_id = ? AND game_players.admitted = ?", handle.user.ID, true)
		query = query.Joins("LEFT JOIN games ON game_players.game_id = games.id")
		if handle.req.Lifecycle != "" {
			query = query.Where("games.lifecycle = ?", handle.req.Lifecycle)
		}
		query = query.Where("games.room_id IS NULL")
		query = query.Order("games.id DESC")
		query = query.Select("games.id")

		var game_ids []uint64
		if err = query.Find(&game_ids).Error; err != nil {
			return err
		}

		for _, game_id := range game_ids {
			var game database.Game
			if err := tx.First(&game, game_id).Error; err != nil {
				return err
			}

			handle.resp = append(handle.resp, SearchGamesHandlerResponse{
				OwnerID:   game.OwnerID,
				GameID:    game.ID,
				Style:     game.Style,
				Lifecycle: game.Lifecycle,
				CreatedAt: game.CreatedAt,
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
