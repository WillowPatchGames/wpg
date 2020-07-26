/*
 * Copyright (C) Alexander Scheel
 *
 * Licensed under the terms of the AGPLv3.
 */

package main

import (
    "flag"
    "log"
    "net/http"

	"git.cipherboy.com/WordCorp/api/pkg/auth"
)

func getCliAddr() string {
    addrPtr := flag.String("addr", "localhost:8042", "Default address to listen on")
    return *addrPtr
}

func main() {
    router := auth.NewRouter()

    srv := &http.Server{
        Handler: router,
        Addr: getCliAddr(),
    }

    log.Fatal(srv.ListenAndServe())
}
