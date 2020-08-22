CREATE TABLE IF NOT EXISTS metadata (
  version BIGSERIAL,
  upgraded TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(version)
);

INSERT INTO metadata (version) VALUES (8);

CREATE TABLE users (
  id       BIGSERIAL PRIMARY KEY,
  username VARCHAR (512),
  display  VARCHAR (512),
  email    VARCHAR (512),
  guest    BOOLEAN DEFAULT false,
  created  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(username),
  UNIQUE(email)
);

CREATE TYPE auth_source AS ENUM ('password', 'api_token', 'TOTP');

CREATE TABLE authentication (
  id       BIGSERIAL PRIMARY KEY,
  user_id  BIGINT,
  category auth_source,
  key      VARCHAR(1024),
  value    VARCHAR(1024),
  created  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires  TIMESTAMP WITH TIME ZONE,

  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, key)
);

CREATE TYPE room_mode AS ENUM ('single', 'dynamic');

CREATE TABLE rooms (
  id        BIGSERIAL PRIMARY KEY,
  owner_id  BIGINT,
  style     room_mode,
  open_room BOOLEAN DEFAULT false,
  join_code VARCHAR(1024),
  config    TEXT DEFAULT '{}',
  created   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  closes    TIMESTAMP WITH TIME ZONE,

  FOREIGN KEY (owner_id) REFERENCES users(id),
  UNIQUE(join_code)
);

CREATE TYPE room_member_type AS ENUM ('pending', 'spectator', 'admin', 'player');

CREATE TABLE room_members (
  id          BIGSERIAL PRIMARY KEY,
  room_id     BIGINT,
  user_id     BIGINT,
  class       room_member_type DEFAULT 'pending',
  invite_code VARCHAR(1024),
  config      TEXT DEFAULT '{}',
  created     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (room_id) REFERENCES rooms(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(room_id, user_id),
  UNIQUE(invite_code)
);

CREATE TYPE game_mode AS ENUM ('rush');
CREATE TYPE game_lifecycle AS ENUM ('pending', 'playing', 'finished');

CREATE TABLE games (
  id        BIGSERIAL PRIMARY KEY,
  owner_id  BIGINT,
  room_id   BIGINT,
  style     game_mode,
  open_room BOOLEAN DEFAULT false,
  join_code VARCHAR(1024),
  config    TEXT DEFAULT '{}',
  state     TEXT DEFAULT '{}',
  lifecycle game_lifecycle DEFAULT 'pending',
  created   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (owner_id) REFERENCES users(id),
  FOREIGN KEY (room_id) REFERENCES rooms(id),
  UNIQUE(join_code)
);

CREATE TYPE game_player_type AS ENUM ('pending', 'spectator', 'player');

CREATE TABLE game_players (
  id          BIGSERIAL PRIMARY KEY,
  game_id     BIGINT,
  user_id     BIGINT,
  class       game_player_type DEFAULT 'pending',
  invite_code VARCHAR(1024),
  state       TEXT DEFAULT '{}',
  created   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (game_id) REFERENCES games(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(game_id, user_id),
  UNIQUE(invite_code)
);

CREATE USER wpg WITH PASSWORD 'CHANGEME';
GRANT ALL PRIVILEGES ON DATABASE wpgdb TO wpg;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO wpg;
ALTER TABLE metadata OWNER TO wpg;
ALTER TABLE users OWNER TO wpg;
ALTER TABLE authentication OWNER TO wpg;
ALTER TABLE rooms OWNER TO wpg;
ALTER TABLE room_member OWNER TO wpg;
ALTER TABLE games OWNER TO wpg;
ALTER TABLE game_players OWNER TO wpg;
