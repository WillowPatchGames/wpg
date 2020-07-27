package user

import (
    "net/http"

    "git.cipherboy.com/WordCorp/api/internal/database"
    "git.cipherboy.com/WordCorp/api/internal/models"
    "git.cipherboy.com/WordCorp/api/internal/utils"

    api_errors "git.cipherboy.com/WordCorp/api/pkg/errors"
)

type registerHandlerData struct {
    Username string `json:"username"`
    Email    string `json:"email"`
    Display  string `json:"display"`
    Password string `json:"password"`
}

type registerHandlerResponse struct {
    UserID   uint64 `json:"id"`
    Username string `json:"username"`
    Email    string `json:"email"`
    Display  string `json:"display"`
}

type RegisterHandler struct {
    http.Handler

    req  registerHandlerData
    resp registerHandlerResponse
}

func (handle RegisterHandler) GetRequest() interface{} {
    return &handle.req
}

func (handle RegisterHandler) GetResponse() interface{} {
    return handle.resp
}

func (handle RegisterHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    err := utils.ParseRequest(w, r, &handle)
    if err != nil {
        api_errors.WriteError(w, err, true)
        return
    }

    tx, err := database.GetTransaction()

    var user models.UserModel
    user.Username = handle.req.Username
    user.Email = handle.req.Email
    user.Display = handle.req.Display
    if user.Display == "" && user.Username != "" {
        user.Display = user.Username
    }

    err = user.Create(tx)
    if err != nil {
        api_errors.WriteError(w, err, true)
    }

    err = user.SetPassword(tx, handle.req.Password)
    if err != nil {
        api_errors.WriteError(w, err, true)
    }

    err = tx.Commit()
    if err != nil {
        api_errors.WriteError(w, err, true)
    }

    w.Header().Set("Content-Type", "application/json")
    w.Write([]byte{byte('\n')})
}
