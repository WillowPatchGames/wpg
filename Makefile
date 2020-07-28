NAMESPACE?=git.cipherboy.com/WordCorp/api
GO?=go
PYTHON?=python3

all: build
test: check

check: vet staticcheck crypt

format:
	$(GO) fmt $(NAMESPACE)/...

vet:
	$(GO) vet $(NAMESPACE)/...

staticcheck:
	test -e ~/go/bin/staticcheck || ( echo "Must install staticcheck: https://staticcheck.io/docs/" && exit 1 )
	$(HOME)/go/bin/staticcheck $(NAMESPACE)/...

crypt: pkg/password/*.go
	go test $(NAMESPACE)/pkg/password

install: install_database

uninstall: remove_database

build: cmds

cmds: wcapi

wcapi: cmd/wcapi/main.go pkg/*/*.go internal/*/*.go
	$(GO) build $(NAMESPACE)/cmd/wcapi

install_database:
	cd scripts/database && ./setup.sh

remove_database:
	cd scripts/database && ./remove.sh || true

clean:
	rm -f wcapi
