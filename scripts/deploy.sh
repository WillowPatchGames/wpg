#!/bin/bash

location="$1"
committish="${2:-master}"

tmp="$HOME/.tmp/wpg-deploy-$RANDOM-$RANDOM-$RANDOM"
mkdir -p "$tmp" && cd "$tmp"

git clone https://git.cipherboy.com/WillowPatchGames/wpg
git clone https://git.cipherboy.com/WillowPatchGames/ansible
git clone https://git.cipherboy.com/WillowPatchGames/nginx-configs

cd wpg && git checkout "$committish" && make clean deps "$location-deploy"
