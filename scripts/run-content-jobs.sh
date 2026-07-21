#!/bin/sh
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  POSTGRES_PASSWORD="$(cat /run/secrets/postgres_password)"
  POSTGRES_PASSWORD_ENCODED="$(node -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' "$POSTGRES_PASSWORD")"
  export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD_ENCODED}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}?schema=public"
fi

exec ./node_modules/.bin/tsx scripts/run-content-jobs.ts
