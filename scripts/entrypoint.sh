#!/bin/sh
set -eu

export AUTH_SECRET="$(cat /run/secrets/auth_secret)"
export POSTGRES_PASSWORD="$(cat /run/secrets/postgres_password)"
export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}?schema=public"

echo "Applying database migrations..."
pnpm exec prisma migrate deploy
pnpm exec prisma db seed
pnpm exec tsx scripts/init-admin.ts
echo "Starting HomeLingua..."
exec pnpm start
