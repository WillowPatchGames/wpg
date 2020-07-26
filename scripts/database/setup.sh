#!/bin/bash

set -euxo pipefail

sudo su postgres -l -c 'psql' <<< 'CREATE DATABASE wordcorp;'
sudo su postgres -l -c 'psql -d wordcorp' < create.sql
