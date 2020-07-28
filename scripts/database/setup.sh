#!/bin/bash

set -euxo pipefail

password="$(tr -cd '[:alnum:]' < /dev/urandom | fold -w 50 | head -n 1 || true)"

sudo su postgres -l -c 'psql' <<< 'CREATE DATABASE wordcorpdb;'
sed "s/CHANGEME/$password/g" create.sql | sudo su postgres -l -c 'psql -d wordcorpdb'

echo "Created database wordcorpdb."
echo "Username: wordcorp"
echo "Password: $password"
