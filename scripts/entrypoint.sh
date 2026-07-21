#!/bin/sh
set -eu

export AUTH_SECRET="$(cat /run/secrets/auth_secret)"
export POSTGRES_PASSWORD="$(cat /run/secrets/postgres_password)"
POSTGRES_PASSWORD_ENCODED="$(node -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' "$POSTGRES_PASSWORD")"
export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD_ENCODED}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}?schema=public"

echo "Applying database migrations..."
# v0.6.0 shipped the content-pipeline enum additions in the same PostgreSQL
# transaction that first used PENDING as a default. PostgreSQL rolled that
# migration back, but Prisma retains the failed attempt until it is resolved.
./node_modules/.bin/prisma migrate resolve --rolled-back 20260721090000_content_pipeline_stage1 >/dev/null 2>&1 || true
./node_modules/.bin/prisma migrate deploy
./node_modules/.bin/tsx scripts/init-content-library.ts
./node_modules/.bin/tsx prisma/seed.ts
./node_modules/.bin/tsx scripts/init-admin.ts
echo "Starting HomeLingua..."
exec ./node_modules/.bin/next start
