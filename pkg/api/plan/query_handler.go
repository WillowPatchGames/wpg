package plan

import (
	"errors"
	"net/http"

	"gorm.io/gorm"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
	"git.cipherboy.com/WillowPatchGames/wpg/internal/utils"

	api_errors "git.cipherboy.com/WillowPatchGames/wpg/pkg/errors"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/auth"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/hwaterr"
)

type queryHandlerData struct {
	PlanID   uint64 `json:"id,omitempty" query:"id,omitempty" route:"PlanID,omitempty"`
	Slug     string `json:"slug,omitempty" query:"slug,omitempty" route:"Slug,omitempty"`
	APIToken string `json:"api_token,omitempty" header:"X-Auth-Token,omitempty" query:"api_token,omitempty"`
}

type QueryHandler struct {
	auth.Authed
	hwaterr.ErrableHandler
	utils.HTTPRequestHandler

	req  queryHandlerData
	resp database.Plan
	user *database.User
}

func (handle QueryHandler) GetResponse() interface{} {
	return handle.resp
}

func (handle *QueryHandler) GetObjectPointer() interface{} {
	return &handle.req
}

func (handle *QueryHandler) GetToken() string {
	return handle.req.APIToken
}

func (handle *QueryHandler) SetUser(user *database.User) {
	handle.user = user
}

func (handle QueryHandler) verifyRequest() error {
	var present int = 0

	if handle.req.PlanID != 0 {
		present++
	}

	if handle.req.Slug != "" {
		present++
	}

	if present == 0 {
		return api_errors.ErrMissingRequest
	}

	if present > 1 {
		return api_errors.ErrTooManySpecifiers
	}

	return nil
}

func (handle *QueryHandler) ServeErrableHTTP(w http.ResponseWriter, r *http.Request) error {
	err := handle.verifyRequest()
	if err != nil {
		return hwaterr.WrapError(err, http.StatusBadRequest)
	}

	if err := database.InTransaction(func(tx *gorm.DB) error {
		if handle.req.PlanID != 0 {
			if err := tx.First(&handle.resp, handle.req.PlanID).Error; err != nil {
				return err
			}
		} else if handle.req.Slug != "" {
			if err := tx.First(&handle.resp, "slug = ?", handle.req.Slug).Error; err != nil {
				return err
			}
		}

		if handle.resp.ID == 0 {
			return hwaterr.WrapError(errors.New("unable to find specified plan"), http.StatusNotFound)
		}

		return nil
	}); err != nil {
		return err
	}

	utils.SendResponse(w, r, handle)
	return nil
}
