#!/bin/bash

cat ~/.ssh/id_ed25519 <<< "$BETA_DEPLOY_SSH_KEY"
echo "beta.willowpatchgames.com,198.199.79.217 ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBD11Fl5T69bFHQqZjEekGRksG8uuPoI4JzDNcUuu0BGwGG7wZsuQ4WRuVYzJ1hDJCEn7HJtqm0m/uSGRAn1qBxM=" >> "$HOME/.ssh/known_hosts"
make beta-deploy
