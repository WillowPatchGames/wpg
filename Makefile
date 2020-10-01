NAMESPACE?=git.cipherboy.com/WillowPatchGames/wpg
GO?=go
PYTHON?=python3
DIST?=build.tar

all: build

test: check

dist: distui tarball

check: vet gosec staticcheck crypt utils games database api

deps:
	go get -u $(NAMESPACE)/...
	cd assets/static && npm install
	./scripts/words.sh

deps-update: deps
	go mod tidy
	cd assets/static && npm audit fix

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

staticcheck:
	test -e ~/go/bin/staticcheck || ( echo "Must install staticcheck: https://staticcheck.io/docs/" && exit 1 )
	$(HOME)/go/bin/staticcheck $(NAMESPACE)/...

crypt: pkg/password/*.go
	go test $(NAMESPACE)/pkg/password

utils: internal/utils/*.go
	go test $(NAMESPACE)/internal/utils

games: pkg/games/*.go
	go test $(NAMESPACE)/pkg/games

database: internal/database/*.go
	go test $(NAMESPACE)/internal/database

api:
	bash ./scripts/api-tests.sh $(PYTHON)

install: install_database

uninstall: remove_database

build: cmds

cmds: wpgapi

wpgapi: cmd/wpgapi/main.go pkg/*/*.go internal/*/*.go
	$(GO) build $(NAMESPACE)/cmd/wpgapi

install_database:
	cd scripts/database && ./setup.sh

remove_database:
	cd scripts/database && ./remove.sh || true

clean:
	rm -f wpgapi wpg.sqlite3

submod:
	git submodule init && git submodule update

webui:
	cd assets/static && REACT_EDITOR=none BROWSER=none npm start

distui:
	cd assets/static && REACT_EDITOR=none BROWSER=none npm run build
	cp assets/static/public/csw15.txt assets/static/build/csw15.txt

tarball: build
	rm -f $(DIST) $(DIST).xz
	tar -cf $(DIST) wpgapi assets/wordlist.txt
	tar -rf $(DIST) -C assets/static build
	tar -rf $(DIST) -C scripts database
	tar -rf $(DIST) -C scripts units
	xz $(DIST)

beta-deploy: all dist
	mv $(DIST).xz ../ansible/files/$(DIST).xz
	cd ../nginx-configs && tar -cJf ../ansible/files/nginx.tar.xz *
	cd ../ansible && ansible-playbook -i hosts beta.yml
