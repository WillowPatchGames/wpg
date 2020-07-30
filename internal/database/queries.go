package database

var t_users = "users"
var t_auths = "authentication"

// User Model

var GetUserFromEID = "SELECT id, eid, username, display, email FROM " +
	t_users + " WHERE eid=$1"
var GetUserFromUsername = "SELECT id, eid, username, display, email FROM " +
	t_users + " WHERE username=$1"
var GetUserFromEmail = "SELECT id, eid, username, display, email FROM " +
	t_users + " WHERE email=$1"

var InsertUser = "INSERT INTO " + t_users + " (eid, username, display, " +
	"email) VALUES ($1, $2, $3, $4) RETURNING id"

var SetPassword = "INSERT INTO " + t_auths + " (user_id, category, key, value) VALUES ($1, 'password', 'current-password', $2)"
