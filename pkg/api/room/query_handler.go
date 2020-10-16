package room

import (
	"errors"
	"net/http"
	"strings"

	"gorm.io/gorm"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
	"git.cipherboy.com/WillowPatchGames/wpg/internal/utils"

	api_errors "git.cipherboy.com/WillowPatchGames/wpg/pkg/errors"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/auth"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/hwaterr"
)

type queryHandlerData struct {
	RoomID   uint64 `json:"id,omitempty" query:"id,omitempty" route:"RoomID,omitempty"`
	JoinCode string `json:"join,omitempty" query:"join,omitempty" route:"JoinCode,omitempty"`
	APIToken string `json:"api_token,omitempty" header:"X-Auth-Token,omitempty" query:"api_token,omitempty"`
}

type membersInfo struct {
	UserID   uint64 `json:"user_id,omitempty"`
	Admitted bool   `json:"admitted"`
	JoinCode string `json:"join_code,omitempty"`
	Banned   bool   `json:"banned"`
}

type queryHandlerResponse struct {
	RoomID uint64 `json:"id"`
	Owner  uint64 `json:"owner"`
	Style  string `json:"style,omitempty"`
	Open   bool   `json:"open,omitempty"`
	Games  struct {
		Pending  []uint64 `json:"pending,omitempty"`
		Playing  []uint64 `json:"playing,omitempty"`
		Finished []uint64 `json:"finished,omitempty"`
	} `json:"games"`
	Admitted bool          `json:"admitted"`
	Members  []membersInfo `json:"members,omitempty"`
}

type QueryHandler struct {
	auth.Authed
	hwaterr.ErrableHandler
	utils.HTTPRequestHandler

	req  queryHandlerData
	resp queryHandlerResponse
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

func (handle *QueryHandler) Validate() error {
	if handle.req.RoomID == 0 && handle.req.JoinCode == "" {
		return api_errors.ErrMissingRequest
	}

	if handle.req.RoomID != 0 && handle.req.JoinCode != "" {
		return api_errors.ErrTooManySpecifiers
	}

	if handle.req.JoinCode != "" {
		if !strings.HasPrefix(handle.req.JoinCode, "rc-") && !strings.HasPrefix(handle.req.JoinCode, "rp-") {
			return errors.New("invalid join code identifier format")
		}
	}

	return nil
}

func (handle *QueryHandler) ServeErrableHTTP(w http.ResponseWriter, r *http.Request) error {
	err := handle.Validate()
	if err != nil {
		return hwaterr.WrapError(err, http.StatusBadRequest)
	}

	var room database.Room
	var room_member database.RoomMember

	if err := database.InTransaction(func(tx *gorm.DB) error {
		if handle.req.RoomID > 0 {
			if err := tx.First(&room, handle.req.RoomID).Error; err != nil {
				return err
			}

			// Looking up a room by integer identifier isn't sufficient to join any
			// room. Return an error in this case.
			if err := tx.First(&room_member, "user_id = ? AND room_id = ?", handle.user.ID, room.ID).Error; err != nil {
				return err
			}
		} else if strings.HasPrefix(handle.req.JoinCode, "rc-") {
			if err := tx.First(&room, "join_code = ?", handle.req.JoinCode).Error; err != nil {
				return err
			}

			if err := tx.First(&room_member, "user_id = ? AND room_id = ?", handle.user.ID, room.ID).Error; err != nil {
				if !room.Open {
					return errors.New("unable to join closed room by room-level join code identifier")
				}

				room_member.UserID.Valid = true
				room_member.UserID.Int64 = int64(handle.user.ID)
				room_member.RoomID = room.ID
				room_member.Admitted = false
				if err := tx.Create(&room_member).Error; err != nil {
					return err
				}
			}
		} else if strings.HasPrefix(handle.req.JoinCode, "rp-") {
			if err := tx.First(&room_member, "join_code = ?", handle.req.JoinCode).Error; err != nil {
				return err
			}

			if room_member.UserID.Valid && room_member.UserID.Int64 != int64(handle.user.ID) {
				err = errors.New("unable to join with another users' join code")
				return hwaterr.WrapError(err, http.StatusForbidden)
			}

			if !room_member.UserID.Valid {
				room_member.UserID.Valid = true
				room_member.UserID.Int64 = int64(handle.user.ID)
				if err := tx.Save(&room_member).Error; err != nil {
					return err
				}
			}

			if err := tx.First(&room, "id = ?", room_member.RoomID).Error; err != nil {
				return err
			}
		}

		if room_member.Admitted && !room_member.Banned {
			var members []database.RoomMember
			if err := tx.Model(&database.RoomMember{}).Where("room_id = ?", room.ID).Find(&members).Error; err != nil {
				return err
			}

			for _, member := range members {
				if handle.user.ID != room.OwnerID && (!member.Admitted || member.Banned) {
					continue
				}

				var person = membersInfo{
					UserID:   uint64(member.UserID.Int64),
					Admitted: member.Admitted,
					JoinCode: member.JoinCode.String,
					Banned:   member.Banned,
				}

				handle.resp.Members = append(handle.resp.Members, person)
			}

			if err := tx.Model(&database.Game{}).Where("room_id = ? AND lifecycle = ?", room.ID, "pending").Select("id").Find(&handle.resp.Games.Pending).Error; err != nil {
				return err
			}

			if err := tx.Model(&database.Game{}).Where("room_id = ? AND lifecycle = ?", room.ID, "playing").Select("id").Find(&handle.resp.Games.Playing).Error; err != nil {
				return err
			}

			if err := tx.Model(&database.Game{}).Where("room_id = ? AND lifecycle = ?", room.ID, "finished").Select("id").Find(&handle.resp.Games.Finished).Error; err != nil {
				return err
			}
		}

		return nil
	}); err != nil {
		return err
	}

	handle.resp.RoomID = room.ID
	handle.resp.Owner = room.OwnerID
	handle.resp.Admitted = room_member.Admitted && !room_member.Banned

	if room_member.Admitted && !room_member.Banned {
		handle.resp.Open = room.Open
		handle.resp.Style = room.Style
	}

	utils.SendResponse(w, r, handle)
	return nil
}
