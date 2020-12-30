#!/bin/bash

tmp="$HOME/.tmp/wpg-deploy-$RANDOM-$RANDOM-$RANDOM"
mkdir -p "$tmp" && cd "$tmp"

git clone https://git.cipherboy.com/WillowPatchGames/wpg
git clone https://git.cipherboy.com/WillowPatchGames/ansible
git clone https://git.cipherboy.com/WillowPatchGames/nginx-configs

cd wpg && make deps beta-deploy
