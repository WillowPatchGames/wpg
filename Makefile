NAMESPACE?=git.cipherboy.com/WillowPatchGames/wpg
GO?=go
GOROOT?=
NPM?=npm
PYTHON?=python3
DIST?=build.tar

all: build

test: check

dist: distui tarball

check: vet gosec staticcheck crypt utils games database business api-tests

deps:
	GOROOT="$(GOROOT)" $(GO) get -u $(NAMESPACE)/...
	cd assets/static && $(NPM) install
	./scripts/words.sh

deps-update: deps
	GOROOT="$(GOROOT)" $(GO) mod tidy
	cd assets/static && $(NPM) audit fix

fuzz:
	GOROOT="$(GOROOT)" $(GO) get -u github.com/dvyukov/go-fuzz/go-fuzz github.com/dvyukov/go-fuzz/go-fuzz-build
	cd pkg/password && go-fuzz-build && go-fuzz

format:
	GOROOT="$(GOROOT)" $(GO) fmt $(NAMESPACE)/...

vet:
	GOROOT="$(GOROOT)" $(GO) vet $(NAMESPACE)/...

gosec:
	test -e ~/go/bin/gosec || ( echo "Must install gosec: https://github.com/securego/gosec" && exit 1 )
	$(HOME)/go/bin/gosec ./...

staticcheck:
	test -e ~/go/bin/staticcheck || ( echo "Must install staticcheck: https://staticcheck.io/docs/" && exit 1 )
	$(HOME)/go/bin/staticcheck $(NAMESPACE)/...

crypt: pkg/password/*.go
	GOROOT="$(GOROOT)" $(GO) test $(NAMESPACE)/pkg/password

utils: internal/utils/*.go
	GOROOT="$(GOROOT)" $(GO) test $(NAMESPACE)/internal/utils

games: pkg/games/*.go
	GOROOT="$(GOROOT)" $(GO) test $(NAMESPACE)/pkg/games

database: internal/database/*.go
	GOROOT="$(GOROOT)" $(GO) test $(NAMESPACE)/internal/database

business: internal/business/*.go
	GOROOT="$(GOROOT)" $(GO) test $(NAMESPACE)/internal/business

api-tests:
	bash ./scripts/api-tests.sh $(PYTHON)

install: install_database

uninstall: remove_database

build: cmds

cmds: wpgapi

wpgapi: cmd/wpgapi/main.go pkg/*/*.go internal/*/*.go
	GOROOT="$(GOROOT)" $(GO) build $(NAMESPACE)/cmd/wpgapi

clean:
	rm -f wpgapi wpg.sqlite3

distclean: clean
	rm -rf assets/static/node_modules assets/static/package-lock.json

submod:
	git submodule init && git submodule update

webui:
	cd assets/static && REACT_EDITOR=none BROWSER=none $(NPM) start

distui:
	cd assets/static && REACT_EDITOR=none BROWSER=none $(NPM) run build
	cp assets/static/public/csw15.txt assets/static/build/csw15.txt
	bash ./scripts/build-gzip.sh

tarball: build
	rm -f $(DIST) $(DIST).xz
	tar -cf $(DIST) wpgapi assets/wordlist.txt
	tar -rf $(DIST) -C assets/static build
	tar -rf $(DIST) -C scripts units
	tar -rf $(DIST) configs
	xz $(DIST)

beta-deploy: all dist
	mv $(DIST).xz ../ansible/files/$(DIST).xz
	cd ../nginx-configs && tar -cJf ../ansible/files/nginx.tar.xz *
	cd ../ansible && bash ./backup.sh beta
	cd ../ansible && ansible-playbook -i hosts beta.yml

prod-deploy: all dist
	mv $(DIST).xz ../ansible/files/$(DIST).xz
	cd ../nginx-configs && tar -cJf ../ansible/files/nginx.tar.xz *
	cd ../ansible && bash ./backup.sh prod
	cd ../ansible && ansible-playbook -i hosts prod.yml
