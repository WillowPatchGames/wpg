install: install_database

uninstall: remove_database

install_database:
	cd scripts/database && ./setup.sh

remove_database:
	cd scripts/database && ./remove.sh || true
