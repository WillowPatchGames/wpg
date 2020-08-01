package database

const t_users = "users"
const t_auths = "authentication"
const t_games = "games"
const t_players = "players"

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

const FromAPIToken = "SELECT user_id FROM authentication WHERE category='api_token' AND key=$1 AND expires > NOW()"

// Game Model

const GetGameFromID = "SELECT id, eid, owner_id, style, open_room, join_code, lifecycle FROM " + t_games + " WHERE id=$1"
const GetGameFromEID = "SELECT id, eid, owner_id, style, open_room, join_code, lifecycle FROM " + t_games + " WHERE eid=$1"
const GetGameFromCode = "SELECT id, eid, owner_id, style, open_room, join_code, lifecycle FROM " + t_games + " WHERE join_code=$1"

const InsertGame = "INSERT INTO " + t_games + " (eid, owner_id, style, open_room, join_code) VALUES ($1, $2, $3, $4, $5) RETURNING id"

const SetGameConfig = "UPDATE " + t_games + " SET config=$1 WHERE id=$2"
const GetGameConfig = "SELECT config FROM " + t_games + " WHERE id=$1"

const SetGameState = "UPDATE " + t_games + " SET state=$1 WHERE id=$2"
const GetGameState = "SELECT state FROM " + t_games + " WHERE id=$1"

const SaveGame = "UPDATE " + t_games + " SET style=$1, lifecycle=$2 WHERE id=$3"

// Player Models

const GetPlayerFromID = "SELECT id, game_id, user_id, class, invite_code FROM " + t_players + " WHERE id=$1"
const GetPlayerFromIDs = "SELECT id, game_id, user_id, class, invite_code FROM " + t_players + " WHERE game_id=$1 AND user_id=$2"

const InsertPlayer = "INSERT INTO " + t_players + " (game_id, user_id, class, invite_code) VALUES ($1, $2, $3, $4) RETURNING id"

const SetPlayerState = "UPDATE " + t_players + " SET state=$1 WHERE id=$2"
const GetPlayerState = "SELECT state FROM " + t_players + " WHERE id=$1"

const SavePlayer = "UPDATE " + t_players + " SET class=$1 WHERE id=$2"
