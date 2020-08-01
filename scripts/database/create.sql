CREATE TABLE metadata (
  version BIGSERIAL,
  upgraded TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(version)
);

INSERT INTO metadata (version) VALUES (5);

CREATE TABLE users (
  id       BIGSERIAL PRIMARY KEY,
  eid      BIGINT,
  username VARCHAR (512) NOT NULL,
  display  VARCHAR (512),
  email    VARCHAR (512),
  created  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(eid),
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

CREATE TYPE game_mode AS ENUM ('rush');
CREATE TYPE game_lifecycle AS ENUM ('pending', 'playing', 'finished');

CREATE TABLE games (
  id        BIGSERIAL PRIMARY KEY,
  eid       BIGINT,
  owner_id  BIGSERIAL,
  style     game_mode,
  open_room BOOLEAN DEFAULT false,
  join_code VARCHAR(1024),
  config    TEXT DEFAULT '{}',
  state     TEXT DEFAULT '{}',
  lifecycle game_lifecycle DEFAULT 'pending',
  created   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (owner_id) REFERENCES users(id),
  UNIQUE(eid),
  UNIQUE(join_code)
);

CREATE TYPE player_type AS ENUM ('pending', 'spectator', 'player');

CREATE TABLE players (
  id          BIGSERIAL PRIMARY KEY,
  game_id     BIGSERIAL,
  user_id     BIGSERIAL,
  class       player_type DEFAULT 'pending',
  invite_code VARCHAR(1024),
  state       TEXT DEFAULT '{}',

  FOREIGN KEY (game_id) REFERENCES games(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(game_id, user_id),
  UNIQUE(invite_code)
);

CREATE USER wordcorp WITH PASSWORD 'CHANGEME';
GRANT ALL PRIVILEGES ON DATABASE wordcorpdb TO wordcorp;
