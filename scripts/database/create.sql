CREATE TABLE metadata (
  version BIGSERIAL,
  upgraded TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(version)
);

INSERT INTO metadata (version) VALUES (1);

CREATE TABLE users (
  id       BIGSERIAL PRIMARY KEY,
  eid      BIGINT,
  username VARCHAR (512) NOT NULL,
  email    VARCHAR (512),
  UNIQUE(eid),
  UNIQUE(username),
  UNIQUE(email)
);

CREATE TYPE auth_source AS ENUM ('password', 'api_token', 'TOTP');

CREATE TABLE authentication (
  user_id  BIGINT,
  category auth_source,
  key      VARCHAR(1024),
  value    VARCHAR(1024),

  FOREIGN KEY (user_id) REFERENCES users(id)
);
