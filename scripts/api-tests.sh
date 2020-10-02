#!/bin/bash

PYTHON="${1:-python3}"

(
  killall wpgapi ; rm -f wpg.sqlite3
	./wpgapi -db_type=sqlite -db_host=wpg.sqlite3 -db_sslmode=disable -db_name=wpgdb -debug=true -static_path="http://127.0.0.1:3000" -addr="0.0.0.0:8042" || true
) &

(
  echo "Waiting for server to start..." && sleep 2
  $PYTHON -c 'import pytest' || $PYTHON -m pip install pytest
  cd test/api && $PYTHON -m pytest
)
ret=$?

kill %1 || true

exit $ret
