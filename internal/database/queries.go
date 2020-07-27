package database

var users = "users"

var GetUserFromEID = "SELECT id, username, display, email FROM " +
  users + " WHERE eid=?"

var InsertUser = "INSERT INTO " + users + " (eid, username, display, " +
  "email) VALUES (?, ?, ?, ?)"
