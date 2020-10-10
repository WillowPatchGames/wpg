package user

import (
	"log"
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

type plansHandlerData struct {
	UserID   uint64 `json:"id,omitempty" query:"id,omitempty" route:"UserID,omitempty"`
	Username string `json:"username,omitempty" query:"username,omitempty" route:"Username,omitempty"`
	Email    string `json:"email,omitempty" query:"email,omitempty" route:"Email,omitempty"`
	Expired  bool   `json:"expired" query:"expired"`
	APIToken string `json:"api_token,omitempty" header:"X-Auth-Token,omitempty" query:"api_token,omitempty"`
}

type plansGameInfoResponse struct {
	RoomID uint64 `json:"room_id,omitempty"`
	GameID uint64 `json:"game_id,omitempty"`
}

type plansHandlerResponse struct {
	id               uint64
	PlanID           uint64        `json:"plan_id"`
	Active           bool          `json:"active"`
	PriceCents       uint          `json:"price_cents"`
	BillingFrequency time.Duration `json:"billing_frequency"`
	Expires          time.Time     `json:"expires"`

	Events []plansGameInfoResponse `json:"events,omitempty"`
}

type PlansHandler struct {
	auth.Authed
	hwaterr.ErrableHandler
	utils.HTTPRequestHandler

	req  plansHandlerData
	resp []plansHandlerResponse
	user *database.User
}

func (handle PlansHandler) GetResponse() interface{} {
	return handle.resp
}

func (handle *PlansHandler) GetObjectPointer() interface{} {
	return &handle.req
}

func (handle *PlansHandler) GetToken() string {
	return handle.req.APIToken
}

func (handle *PlansHandler) SetUser(user *database.User) {
	handle.user = user
}

func (handle PlansHandler) verifyRequest() error {
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

	return nil
}

func (handle *PlansHandler) ServeErrableHTTP(w http.ResponseWriter, r *http.Request) error {
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
		const expired = "user_id = ? AND expires <= ?"
		const not_expired = "user_id = ? AND expires > ?"
		var query string = not_expired
		if handle.req.Expired {
			query = expired
		}

		rows, err := tx.Model(&database.UserPlan{}).Where(query, handle.user.ID, time.Now()).Rows()
		if err != nil {
			return err
		}

		var candidateError error = nil
		for rows.Next() {
			var user_plan database.UserPlan
			if err := tx.ScanRows(rows, &user_plan); err != nil {
				log.Println("Got error scanning UserPlan:", err)
				candidateError = err
				continue
			}

			var entry plansHandlerResponse
			entry.id = user_plan.ID
			entry.PlanID = user_plan.PlanID
			entry.Active = user_plan.Active
			entry.PriceCents = user_plan.PriceCents
			entry.BillingFrequency = user_plan.BillingFrequency
			entry.Expires = user_plan.Expires

			handle.resp = append(handle.resp, entry)
		}
		if err = rows.Close(); err != nil {
			return err
		}

		for _, entry := range handle.resp {
			game_rows, err := tx.Model(&database.UserPlanAccounting{}).Where("user_plan_id = ?", entry.id).Rows()
			if err != nil {
				log.Println("Got error loading UserPlanAccounting for user_plan_id:", entry.id, err)
				candidateError = err
				continue
			}
			defer game_rows.Close()

			for game_rows.Next() {
				var accounted database.UserPlanAccounting
				if err := tx.ScanRows(game_rows, &accounted); err != nil {
					log.Println("Got error scanning UserPlanAccounting:", err)
					candidateError = err
					continue
				}

				var game_entry plansGameInfoResponse
				game_entry.RoomID = uint64(accounted.RoomID.Int64)
				game_entry.GameID = uint64(accounted.GameID.Int64)

				entry.Events = append(entry.Events, game_entry)
			}
		}

		if len(handle.resp) == 0 {
			return candidateError
		}

		return nil
	}); err != nil {
		return err
	}

	utils.SendResponse(w, r, handle)
	return nil
}
