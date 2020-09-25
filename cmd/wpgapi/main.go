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
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/api/auth"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/api/game"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/api/room"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/api/user"
)

const dbFmt string = "host=%s port=%d user=%s password=%s dbname=%s sslmode=%s"

var dbHost string
var dbPort int
var dbUser string
var dbPassword string
var dbName string
var dbSslmode string

// In debug mode, we use this function to walk the set of routes we've added,
// showing them in the logs.
func gorillaWalkFn(route *mux.Route, router *mux.Router, ancestors []*mux.Route) error {
	path, _ := route.GetPathTemplate()
	methods, _ := route.GetMethods()
	log.Println("Routing path:", path, methods)
	return nil
}

func main() {
	var err error

	var addr string
	var dbconn string

	var debug bool
	var proxy bool
	var staticPath string

	flag.StringVar(&addr, "addr", "localhost:8042", "Address to listen for HTTP requests on")
	flag.StringVar(&dbHost, "db_host", "localhost", "Hostname to contact the database over")
	flag.IntVar(&dbPort, "db_port", 5432, "Port to contact the database on")
	flag.StringVar(&dbUser, "db_user", "psql", "Username to contact the database with")
	flag.StringVar(&dbPassword, "db_password", "password", "Password to authentication against the database with")
	flag.StringVar(&dbName, "db_name", "wpgdb", "Database to connect to with")
	flag.StringVar(&dbSslmode, "db_sslmode", "require", "SSL Validation mode (require, verify-full, verify-ca, or disable)")
	flag.BoolVar(&debug, "debug", false, "Enable extra debug information")
	flag.BoolVar(&proxy, "proxy", false, "Enable proxy")
	flag.StringVar(&staticPath, "static_path", "assets/static/public", "Path to web UI static assets")
	flag.Parse()

	// Open Database connection first. Currently we only support postgres
	// databases but we could change that in the future.
	dbconn = fmt.Sprintf(dbFmt, dbHost, dbPort, dbUser, dbPassword, dbName, dbSslmode)

	if debug {
		log.Println("Database connection string", dbconn)
	}

	err = database.OpenDatabase("postgres", dbconn)
	if err != nil {
		panic(err)
	}
	defer database.Close()

	// Add our main API handlers. This extends the main router with relevant
	// routes.
	router := mux.NewRouter()
	auth.BuildRouter(router, debug)
	game.BuildRouter(router, debug)
	room.BuildRouter(router, debug)
	user.BuildRouter(router, debug)

	if debug || proxy {
		// Add static asset handler in debug mode or when we've been asked to proxy
		// stuff. Static asset handler is either a path on disk (when using a
		// production build) or a URL/proxy-pass type deal when using a debug node
		// auto-reloading server.
		var parsed_url *url.URL
		if _, err = os.Stat(staticPath); err == nil {
			log.Println("Adding static asset routing: " + staticPath)
			fileHandler := http.FileServer(http.Dir(staticPath))
			router.PathPrefix("/").Handler(fileHandler)
		} else if parsed_url, err = url.Parse(staticPath); err == nil {
			log.Println("Adding proxied routing: " + staticPath)
			proxyHandler := httputil.NewSingleHostReverseProxy(parsed_url)
			router.PathPrefix("/").Handler(proxyHandler)
		}
	}

	// Add proxy-headers middleware
	handler := handlers.ProxyHeaders(router)

	// Add logging middleware
	handler = handlers.CombinedLoggingHandler(os.Stderr, handler)

	if !debug {
		// This handler prevents logging stacktraces during debug mode. We should
		// leave it enabled for production to avoid crashing the handler in most
		// instances.
		handler = handlers.RecoveryHandler()(handler)
	}

	// Build our server and start it
	srv := &http.Server{
		Handler: handler,
		Addr:    addr,
	}

	// In debug mode, show our added routes.
	if debug {
		err = router.Walk(gorillaWalkFn)
		if err != nil {
			log.Fatal(err)
		}
	}

	log.Println("Listening on " + addr)
	log.Fatal(srv.ListenAndServe())
}
