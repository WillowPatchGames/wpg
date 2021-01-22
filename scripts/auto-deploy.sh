#!/bin/bash

while [ 1 ]; do
    git fetch --all
    beta_tag="$(git tag -l "beta-*" --sort=taggerdate | tail -n 1)"
    prod_tag="$(git tag -l "prod-*" --sort=taggerdate | tail -n 1)"
    if [ "x$beta_tag" != "x" ]; then
        bash ./deploy.sh beta "$beta_tag"
    fi
    if [ "x$prod_tag" != "x" ]; then
        bash ./deploy.sh prod "$prod_tag"
    fi
done
