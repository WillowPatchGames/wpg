#!/bin/bash

set -euxo pipefail

password="$(tr -cd '[:alnum:]' < /dev/urandom | fold -w 50 | head -n 1 || true)"

sudo su postgres -l -c 'psql' <<< 'CREATE DATABASE wordcorp;'
sed "s/CHANGEME/$password/g" create.sql | sudo su postgres -l -c 'psql -d wordcorp'

echo "Create database."
echo "Username: wordcorp"
echo "Password: $password"
