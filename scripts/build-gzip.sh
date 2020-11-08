#!/bin/bash

set -x

find assets/static/build/static -type f -name "*.js" -exec pigz -9 -k --force -q {} \;
find assets/static/build/static -type f -name "*.css" -exec pigz -9 -k --force -q {} \;
