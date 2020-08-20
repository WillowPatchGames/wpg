#!/bin/bash

sudo su postgres -l -c 'psql -d wpg' < destroy.sql
sudo su postgres -l -c 'psql -d wpgdb' < destroy.sql
sudo su postgres -l -c 'psql' <<< "DROP DATABASE wpg;"
sudo su postgres -l -c 'psql' <<< "DROP DATABASE wpgdb;"
