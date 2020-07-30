package database

const t_users = "users"
const t_auths = "authentication"

// User Model

const GetUserFromEID = "SELECT id, eid, username, display, email FROM " +
	t_users + " WHERE eid=$1"
const GetUserFromUsername = "SELECT id, eid, username, display, email FROM " +
	t_users + " WHERE username=$1"
const GetUserFromEmail = "SELECT id, eid, username, display, email FROM " +
	t_users + " WHERE email=$1"

const InsertUser = "INSERT INTO " + t_users + " (eid, username, display, " +
	"email) VALUES ($1, $2, $3, $4) RETURNING id"

const SetPassword = "INSERT INTO " + t_auths + " (user_id, category, key, value) VALUES ($1, 'password', 'current-password', $2)"
const GetPassword = "SELECT value FROM " + t_auths + " WHERE user_id=$1 AND category='password' AND key='current-password'"

// Auth Model
const CreateAPIToken = "INSERT INTO " + t_auths + " (user_id, category, key, expires) VALUES ($1, 'api_token', $2, (NOW() + interval '7 days'))"
