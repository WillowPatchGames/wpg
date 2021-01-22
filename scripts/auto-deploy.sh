#!/bin/bash

while [ 1 ]; do
    git fetch --all

    latest_beta_tag="$(git tag -l "beta-*" --sort=taggerdate | tail -n 1)"
    latest_prod_tag="$(git tag -l "prod-*" --sort=taggerdate | tail -n 1)"

    last_beta_tag="$(cat "$HOME/wpg/.tags/beta")"
    last_prod_tag="$(cat "$HOME/wpg/.tags/prod")"

    if [ "x$latest_beta_tag" != "x" ] && [ "x$latest_beta_tag" != "x$last_beta_tag" ]; then
        bash ./scripts/deploy.sh beta "$latest_beta_tag"
        echo "$latest_beta_tag" > "$HOME/wpg/.tags/beta"
    fi
    if [ "x$latest_prod_tag" != "x" ] && [ "x$latest_prod_tag" != "x$last_prod_tag" ]; then
        bash ./scripts/deploy.sh prod "$latest_prod_tag"
        echo "$latest_beta_tag" > "$HOME/wpg/.tags/prod"
    fi
    sleep 600
done
