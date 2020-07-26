NAMESPACE?=git.cipherboy.com/WordCorp/api

all: build

install: install_database

uninstall: remove_database

build: cmds

cmds: wcapi

wcapi: cmd/wcapi/main.go pkg/auth/*.go
	go build $(NAMESPACE)/cmd/wcapi

install_database:
	cd scripts/database && ./setup.sh

remove_database:
	cd scripts/database && ./remove.sh || true
