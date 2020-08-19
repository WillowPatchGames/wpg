/*
 * Copyright (C) Alexander Scheel
 *
 * Licensed under the terms of the AGPLv3.
 */

package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"

	"git.cipherboy.com/WillowPatchGames/wpg/internal/database"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/auth"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/game"
	"git.cipherboy.com/WillowPatchGames/api/pkg/room"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/user"
)

const db_fmt string = "host=%s port=%d user=%s password=%s dbname=%s sslmode=%s"

var db_host string
var db_port int
var db_user string
var db_password string
var db_name string
var db_sslmode string

func gorillaWalkFn(route *mux.Route, router *mux.Router, ancestors []*mux.Route) error {
	path, _ := route.GetPathTemplate()
	log.Println("Routing path:", path)
	return nil
}

func main() {
	var err error

	var addr string
	var dbconn string

	var debug bool
	var proxy bool
	var static_path string

	flag.StringVar(&addr, "addr", "localhost:8042", "Address to listen for HTTP requests on")
	flag.StringVar(&db_host, "db_host", "localhost", "Hostname to contact the database over")
	flag.IntVar(&db_port, "db_port", 5432, "Port to contact the database on")
	flag.StringVar(&db_user, "db_user", "psql", "Username to contact the database with")
	flag.StringVar(&db_password, "db_password", "password", "Password to authentication against the database with")
	flag.StringVar(&db_name, "db_name", "wpgdb", "Database to connect to with")
	flag.StringVar(&db_sslmode, "db_sslmode", "require", "SSL Validation mode (require, verify-full, verify-ca, or disable)")
	flag.BoolVar(&debug, "debug", false, "Enable extra debug information")
	flag.BoolVar(&proxy, "proxy", false, "Enable proxy")
	flag.StringVar(&static_path, "static_path", "assets/static/public", "Path to web UI static assets")
	flag.Parse()

	// Open Database connection first
	dbconn = fmt.Sprintf(db_fmt, db_host, db_port, db_user, db_password, db_name, db_sslmode)

	if debug {
		log.Println("Database connection string", dbconn)
	}

	err = database.OpenDatabase("postgres", dbconn)
	if err != nil {
		panic(err)
	}
	defer database.DB.Close()

	// Add our main application routers
	router := mux.NewRouter()
	auth.BuildRouter(router, debug)
	game.BuildRouter(router, debug)
	room.BuildRouter(router, debug)
	user.BuildRouter(router, debug)

	if debug || proxy {
		// Add static asset handler in debug mode
		if _, err := os.Stat(static_path); err == nil {
			log.Println("Adding static asset routing: " + static_path)
			fileHandler := http.FileServer(http.Dir(static_path))
			router.PathPrefix("/").Handler(fileHandler)
		} else if url, err := url.Parse(static_path); err == nil {
			log.Println("Adding proxied routing: " + static_path)
			proxyHandler := httputil.NewSingleHostReverseProxy(url)
			router.PathPrefix("/").Handler(proxyHandler)
		}
	}

	// Add proxy-headers middleware
	handler := handlers.ProxyHeaders(router)

	// Add logging middleware
	handler = handlers.CombinedLoggingHandler(os.Stderr, handler)

	// Add recovery middleware
	handler = handlers.RecoveryHandler()(handler)

	// Build our server and start it
	srv := &http.Server{
		Handler: handler,
		Addr:    addr,
	}

	if debug {
		err = router.Walk(gorillaWalkFn)
		if err != nil {
			log.Fatal(err)
		}
	}

	log.Println("Listening on " + addr)
	log.Fatal(srv.ListenAndServe())
}
