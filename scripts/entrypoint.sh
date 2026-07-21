#!/bin/sh
set -eu

export AUTH_SECRET="$(cat /run/secrets/auth_secret)"
export POSTGRES_PASSWORD="$(cat /run/secrets/postgres_password)"
POSTGRES_PASSWORD_ENCODED="$(node -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' "$POSTGRES_PASSWORD")"
export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD_ENCODED}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}?schema=public"

echo "Applying database migrations..."
./node_modules/.bin/prisma migrate deploy
./node_modules/.bin/tsx scripts/init-content-library.ts
./node_modules/.bin/tsx prisma/seed.ts
./node_modules/.bin/tsx scripts/init-admin.ts
echo "Starting HomeLingua..."
exec ./node_modules/.bin/next start
