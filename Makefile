NAMESPACE?=git.cipherboy.com/WordCorp/api
GO?=go
PYTHON?=python3

all: build
test: check

check: vet gosec safesql staticcheck crypt

fuzz:
	go get -u github.com/dvyukov/go-fuzz/go-fuzz github.com/dvyukov/go-fuzz/go-fuzz-build
	cd pkg/password && go-fuzz-build && go-fuzz

format:
	$(GO) fmt $(NAMESPACE)/...

vet:
	$(GO) vet $(NAMESPACE)/...

gosec:
	test -e ~/go/bin/gosec || ( echo "Must install gosec: https://github.com/securego/gosec" && exit 1 )
	$(HOME)/go/bin/gosec ./...

safesql:
	test -e ~/go/bin/safesql || ( echo "Must install gosec: https://github.com/stripe/safesql" && exit 1 )
	$(HOME)/go/bin/safesql $(NAMESPACE)/...

staticcheck:
	test -e ~/go/bin/staticcheck || ( echo "Must install staticcheck: https://staticcheck.io/docs/" && exit 1 )
	$(HOME)/go/bin/staticcheck $(NAMESPACE)/...

crypt: pkg/password/*.go
	go test $(NAMESPACE)/pkg/password

api:
	$(PYTHON) -c 'import pytest' || $(PYTHON) -m pip install pytest
	cd test/api && $(PYTHON) -m pytest

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

submod:
	git submodule init && git submodule update

webui:
	cd assets/webui && make run
