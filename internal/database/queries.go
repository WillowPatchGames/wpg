package database

const t_users = "users"
const t_auths = "authentication"
const t_rooms = "rooms"

// const t_members = "room_memberss"
const t_games = "games"
const t_players = "game_players"

// User Model

const GetUserFromID = "SELECT id, username, display, email, guest FROM " +
	t_users + " WHERE id=$1"
const GetUserFromUsername = "SELECT id, username, display, email, guest FROM " +
	t_users + " WHERE username=$1"
const GetUserFromEmail = "SELECT id, username, display, email, guest FROM " +
	t_users + " WHERE email=$1"

const InsertUser = "INSERT INTO " + t_users + " (username, display, " +
	"email, guest) VALUES ($1, $2, $3, $4) RETURNING id"
const InsertGuest = "INSERT INTO " + t_users + " (display, " +
	"guest) VALUES ($1, $2) RETURNING id"

const UpdateUser = "UPDATE " + t_users + " SET username=$1, email=$2, display=$3, guest=$4 WHERE id=$5"

const SetPassword = "INSERT INTO " + t_auths + " (user_id, category, key, value) VALUES ($1, 'password', 'current-password', $2)"
const GetPassword = "SELECT value FROM " + t_auths + " WHERE user_id=$1 AND category='password' AND key='current-password'"

// Auth Model
const CreateAPIToken = "INSERT INTO " + t_auths + " (user_id, category, key, expires) VALUES ($1, 'api_token', $2, (NOW() + interval '7 days'))"
const CreateGuestToken = "INSERT INTO " + t_auths + " (user_id, category, key, value, expires) VALUES ($1, 'api_token', $2, 'guest', (NOW() + interval '6 months'))"

const InvalidateToken = "UPDATE " + t_auths + " SET expires=NOW() WHERE key=$1"

// #nosec G101
const FromAPIToken = "SELECT user_id FROM authentication WHERE category='api_token' AND key=$1 AND expires > NOW()"

// Room Model

const GetRoomFromID = "SELECT id, owner_id, style, open_room, join_code FROM " + t_rooms + " WHERE id=$1"
const GetRoomFromCode = "SELECT id, owner_id, style, open_room, join_code FROM " + t_rooms + " WHERE join_code=$1"

const InsertRoom = "INSERT INTO " + t_rooms + " (owner_id, style, open_room, join_code) VALUES ($1, $2, $3, $4) RETURNING id"

const SetRoomConfig = "UPDATE " + t_rooms + " SET config=$1 WHERE id=$2"
const GetRoomConfig = "SELECT config FROM " + t_rooms + " WHERE id=$1"

const GetRoomCurrentGame = "SELECT id FROM " + t_games + " WHERE room_id=$1 AND (lifecycle='pending' OR lifecycle='playing')"

const SaveRoom = "UPDATE " + t_rooms + " SET style=$1 WHERE id=$2"

// Game Model

const GetGameFromID = "SELECT id, owner_id, room_id, style, open_room, join_code, lifecycle FROM " + t_games + " WHERE id=$1"
const GetGameFromCode = "SELECT id, owner_id, room_id, style, open_room, join_code, lifecycle FROM " + t_games + " WHERE join_code=$1"

const InsertGame = "INSERT INTO " + t_games + " (owner_id, room_id, style, open_room, join_code) VALUES ($1, $2, $3, $4, $5) RETURNING id"

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
