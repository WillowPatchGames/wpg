NAMESPACE?=git.cipherboy.com/WordCorp/api

all: build

install: install_database

uninstall: remove_database

build: cmds

cmds: wcauther

wcauther: cmd/wcauther/main.go pkg/auth/*.go
	go build $(NAMESPACE)/cmd/wcauther

install_database:
	cd scripts/database && ./setup.sh

remove_database:
	cd scripts/database && ./remove.sh || true
