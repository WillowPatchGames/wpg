#!/bin/bash

location="$1"
committish="${2:-master}"

tmp="$HOME/.tmp/wpg-deploy-$RANDOM-$RANDOM-$RANDOM"
mkdir -p "$tmp" && cd "$tmp"

git clone https://git.cipherboy.com/WillowPatchGames/wpg
git clone https://git.cipherboy.com/WillowPatchGames/ansible
git clone https://git.cipherboy.com/WillowPatchGames/nginx-configs

cd wpg && git checkout "$committish"
if [ -e assets/static/src/images/.git ]; then
    git pull
else
    rm -rf assets/static/src/images && git clone https://git.cipherboy.com/WillowPatchGames/images assets/static/src/images
fi

make clean deps "$location-deploy"
