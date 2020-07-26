#!/bin/bash

set -euxo pipefail

sudo su postgres -l -c 'psql -d wordcorp' < destroy.sql
sudo su postgres -l -c 'psql' <<< "DROP DATABASE wordcorp;"
