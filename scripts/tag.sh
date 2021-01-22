#!/bin/bash

location="${1:-beta}"
tag="$location-$(date +%s)"

git tag "$tag" && git push origin "$tag" && (git push upstream "$tag" || true)
