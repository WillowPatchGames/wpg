package plan

import (
	"github.com/gorilla/mux"

	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/auth"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/hwaterr"
	"git.cipherboy.com/WillowPatchGames/wpg/pkg/middleware/parsel"
)

// BuildRouter registers routes
func BuildRouter(router *mux.Router, debug bool) {
	var config parsel.ParselConfig
	config.DebugLogging = debug
	config.ParseMuxRoute = true
	config.SchemaTag = "json"

	var queryFactory = func() parsel.Parseltongue {
		inner := new(QueryHandler)
		return auth.Allow(inner)
	}

	router.Handle("/api/v1/plan/{PlanID:[0-9]+}", parsel.Wrap(queryFactory, config)).Methods("GET")
	router.Handle("/api/v1/plan/{Slug:[a-zA-Z][a-zA-Z0-9-]+}", parsel.Wrap(queryFactory, config)).Methods("GET")

	router.Handle("/api/v1/plans", hwaterr.Wrap(new(AllHandler))).Methods("GET")
}
