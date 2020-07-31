package database

const t_users = "users"
const t_auths = "authentication"
const t_games = "games"

// User Model

const GetUserFromID = "SELECT id, eid, username, display, email FROM " +
	t_users + " WHERE id=$1"
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

// Game Model

const GetGameFromEID = "SELECT id, eid, owner_id, style, open_room, join_code, finished FROM " + t_games + " WHERE eid=$1"

const InsertGame = "INSERT INTO " + t_games + " (eid, owner_id, style, open_room, join_code) VALUES ($1, $2, $3, $4, $5) RETURNING id"

const SetConfig = "UPDATE games SET config=$1 WHERE id=$2"
const GetConfig = "SELECT config FROM games WHERE id=$1"

const SetState = "UPDATE games SET state=$1 WHERE id=$2"
const GetState = "SELECT state FROM games WHERE id=$1"
