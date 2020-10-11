package plan

import (
	"net/http"

	"gorm.io/gorm"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/business"
	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
	"git.cipherboy.com/WillowPatchGames/wpg/internal/utils"

	api_errors "git.cipherboy.com/WillowPatchGames/wpg/pkg/errors"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/auth"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/hwaterr"
)

type checkoutHandlerData struct {
	PlanID     uint64 `json:"id,omitempty" query:"id,omitempty" route:"PlanID,omitempty"`
	PriceCents uint   `json:"price_cents,omitempty" query:"price_cents,omitempty"`
	APIToken   string `json:"api_token,omitempty" header:"X-Auth-Token,omitempty" query:"api_token,omitempty"`
}

type checkoutHandlerResponse struct {
	PlanID         uint64 `json:"plan_id"`
	PriceCents     uint   `json:"price_cents"`
	SessionID      string `json:"stripe_session_id"`
	PublishableKey string `json:"stripe_publishable_key"`
}

type CheckoutHandler struct {
	auth.Authed
	hwaterr.ErrableHandler
	utils.HTTPRequestHandler

	req  checkoutHandlerData
	resp checkoutHandlerResponse
	user *database.User
}

func (handle CheckoutHandler) GetResponse() interface{} {
	return handle.resp
}

func (handle *CheckoutHandler) GetObjectPointer() interface{} {
	return &handle.req
}

func (handle *CheckoutHandler) GetToken() string {
	return handle.req.APIToken
}

func (handle *CheckoutHandler) SetUser(user *database.User) {
	handle.user = user
}

func (handle *CheckoutHandler) ServeErrableHTTP(w http.ResponseWriter, r *http.Request) error {
	if handle.user == nil || handle.user.ID == 0 {
		return hwaterr.WrapError(api_errors.ErrAccessDenied, http.StatusUnauthorized)
	}

	if err := database.InTransaction(func(tx *gorm.DB) error {
		session_id, err := business.ExecuteStripePayment(tx, handle.user, handle.req.PlanID, handle.req.PriceCents)
		handle.resp.SessionID = session_id
		return err
	}); err != nil {
		return err
	}

	handle.resp.PublishableKey = business.GetStripePublishableKey()

	utils.SendResponse(w, r, handle)
	return nil
}
