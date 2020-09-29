package database

const tUsers = "users"
const tUserConfigs = "user_configs"

const tAuths = "authentication"
const tRooms = "rooms"

// const t_members = "room_memberss"
const tGames = "games"
const tPlayers = "game_players"

// User Model

const GetUserFromID = "SELECT id, username, display, email, guest FROM " +
	tUsers + " WHERE id=$1"
const GetUserFromUsername = "SELECT id, username, display, email, guest FROM " +
	tUsers + " WHERE username=$1"
const GetUserFromEmail = "SELECT id, username, display, email, guest FROM " +
	tUsers + " WHERE email=$1"

const InsertUser = "INSERT INTO " + tUsers + " (username, display, " +
	"email, guest) VALUES ($1, $2, $3, $4) RETURNING id"
const InsertGuest = "INSERT INTO " + tUsers + " (display, " +
	"guest) VALUES ($1, $2) RETURNING id"

const UpdateUser = "UPDATE " + tUsers + " SET username=$1, email=$2, display=$3, guest=$4 WHERE id=$5"

const SetPassword = "INSERT INTO " + tAuths + " (user_id, category, key, value) VALUES ($1, 'password', 'current-password', $2)"
const GetPassword = "SELECT value FROM " + tAuths + " WHERE user_id=$1 AND category='password' AND key='current-password'"

// User Config

const GetConfig = "SELECT value FROM " + tUserConfigs + " WHERE user_id=$1 AND key=$2"

const UpdateIsertConfig = "INSERT INTO " + tUserConfigs + " (user_id, key, value) " +
	"VALUES ($1, $2, $3) ON CONFLICT (user_id, key) DO UPDATE SET value=$3 " +
	"WHERE " + tUserConfigs + ".user_id=$1 AND " + tUserConfigs + ".key=$2"

// Auth Model

const CreateAPIToken = "INSERT INTO " + tAuths + " (user_id, category, key, expires) VALUES ($1, 'api_token', $2, (NOW() + interval '7 days'))"
const CreateGuestToken = "INSERT INTO " + tAuths + " (user_id, category, key, value, expires) VALUES ($1, 'api_token', $2, 'guest', (NOW() + interval '6 months'))"

const InvalidateToken = "UPDATE " + tAuths + " SET expires=NOW() WHERE key=$1"

const FromAPIToken = "SELECT user_id FROM authentication WHERE category='api_token' AND key=$1 AND expires > NOW()" // #nosec G101

// Room Model

const GetRoomFromID = "SELECT id, owner_id, style, open_room, join_code FROM " + tRooms + " WHERE id=$1"
const GetRoomFromCode = "SELECT id, owner_id, style, open_room, join_code FROM " + tRooms + " WHERE join_code=$1"

const InsertRoom = "INSERT INTO " + tRooms + " (owner_id, style, open_room, join_code) VALUES ($1, $2, $3, $4) RETURNING id"

const SetRoomConfig = "UPDATE " + tRooms + " SET config=$1 WHERE id=$2"
const GetRoomConfig = "SELECT config FROM " + tRooms + " WHERE id=$1"

const GetRoomCurrentGame = "SELECT id FROM " + tGames + " WHERE room_id=$1 AND (lifecycle='pending' OR lifecycle='playing')"

const SaveRoom = "UPDATE " + tRooms + " SET style=$1 WHERE id=$2"

// Game Model

const GetGameFromID = "SELECT id, owner_id, room_id, style, open_room, join_code, lifecycle FROM " + tGames + " WHERE id=$1"
const GetGameFromCode = "SELECT id, owner_id, room_id, style, open_room, join_code, lifecycle FROM " + tGames + " WHERE join_code=$1"

const InsertGame = "INSERT INTO " + tGames + " (owner_id, room_id, style, open_room, join_code) VALUES ($1, $2, $3, $4, $5) RETURNING id"

const SetGameConfig = "UPDATE " + tGames + " SET config=$1 WHERE id=$2"
const GetGameConfig = "SELECT config FROM " + tGames + " WHERE id=$1"

const SetGameState = "UPDATE " + tGames + " SET state=$1 WHERE id=$2"
const GetGameState = "SELECT state FROM " + tGames + " WHERE id=$1"

const SaveGame = "UPDATE " + tGames + " SET style=$1, lifecycle=$2 WHERE id=$3"

// Player Models

const GetPlayerFromID = "SELECT id, game_id, user_id, class, invite_code FROM " + tPlayers + " WHERE id=$1"
const GetPlayerFromIDs = "SELECT id, game_id, user_id, class, invite_code FROM " + tPlayers + " WHERE game_id=$1 AND user_id=$2"

const InsertPlayer = "INSERT INTO " + tPlayers + " (game_id, user_id, class, invite_code) VALUES ($1, $2, $3, $4) RETURNING id"

const SetPlayerState = "UPDATE " + tPlayers + " SET state=$1 WHERE id=$2"
const GetPlayerState = "SELECT state FROM " + tPlayers + " WHERE id=$1"

const SavePlayer = "UPDATE " + tPlayers + " SET class=$1 WHERE id=$2"
