#!/bin/sh
set -eu
POSTGRES_PASSWORD="$(cat /run/secrets/postgres_password)"
POSTGRES_PASSWORD_ENCODED="$(node -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' "$POSTGRES_PASSWORD")"
export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD_ENCODED}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}?schema=public"
URL="${OEWN_URL:-https://en-word.net/static/english-wordnet-2025.zip}"
WORK="${OEWN_WORK_DIR:-/tmp/oewn}"
mkdir -p "$WORK"
echo "Downloading Open English WordNet (CC BY 4.0)..."
wget -q -O "$WORK/oewn.zip" "$URL"
unzip -oq "$WORK/oewn.zip" -d "$WORK"
DICT_DIR="$(find "$WORK" -type f -name data.noun -exec dirname {} \; | head -n 1)"
test -n "$DICT_DIR" || { echo "Open English WordNet data.noun was not found." >&2; exit 1; }
export OEWN_DICT_DIR="$DICT_DIR"
./node_modules/.bin/tsx scripts/import-open-wordnet.ts
