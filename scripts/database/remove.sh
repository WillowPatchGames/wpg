#!/bin/bash

sudo su postgres -l -c 'psql -d wordcorp' < destroy.sql
sudo su postgres -l -c 'psql -d wordcorpdb' < destroy.sql
sudo su postgres -l -c 'psql' <<< "DROP DATABASE wordcorp;"
sudo su postgres -l -c 'psql' <<< "DROP DATABASE wordcorpdb;"
