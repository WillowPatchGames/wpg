#!/bin/bash

set -euxo pipefail

password="$(tr -cd '[:alnum:]' < /dev/urandom | fold -w 50 | head -n 1 || true)"

sudo su postgres -l -c 'psql' <<< 'CREATE DATABASE wpgdb;'
sed "s/CHANGEME/$password/g" create.sql | sudo su postgres -l -c 'psql -d wpgdb'

echo "Created database wpgdb."
echo "Username: wpg"
echo "Password: $password"
