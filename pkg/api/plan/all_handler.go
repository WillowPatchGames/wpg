package plan

import (
	"net/http"

	"gorm.io/gorm"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
	"git.cipherboy.com/WillowPatchGames/wpg/internal/utils"

	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/hwaterr"
)

type AllHandler struct {
	hwaterr.ErrableHandler
	utils.HTTPRequestHandler

	resp []uint64
}

func (handle *AllHandler) GetResponse() interface{} {
	return handle.resp
}

func (handle *AllHandler) GetObjectPointer() interface{} { return nil }

func (handle *AllHandler) ServeErrableHTTP(w http.ResponseWriter, r *http.Request) error {
	if err := database.InTransaction(func(tx *gorm.DB) error {
		return tx.Model(&database.Plan{}).Where("visible = ?", true).Select("id").Find(&handle.resp).Error
	}); err != nil {
		return err
	}

	utils.SendResponse(w, r, handle)
	return nil
}
