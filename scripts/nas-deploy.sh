#!/bin/sh
set -eu

PROJECT_DIR="${PROJECT_DIR:-/volume2/docker/EnglishLearning}"
cd "$PROJECT_DIR"
for file in postgres_password auth_secret settings_encryption_key initial_admin_email initial_admin_password; do
  if [ ! -s "secrets/$file" ]; then echo "Missing or empty secret: $PROJECT_DIR/secrets/$file" >&2; exit 2; fi
done
chmod 700 secrets
chmod 644 secrets/*
mkdir -p data/postgres uploads logs backups backups/restore-staging
git config --global --add safe.directory "$PROJECT_DIR" >/dev/null 2>&1 || true
if docker compose ps -q postgres 2>/dev/null | grep -q .; then
  echo "Creating pre-upgrade backup..."
  docker compose --profile operations run --rm backup
fi
git pull --ff-only origin main
docker compose config >/dev/null
docker compose build --pull app
docker compose up -d
attempt=0
until curl -fsS http://127.0.0.1:3000/api/health/ready >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 40 ]; then echo "Health check timed out." >&2; docker compose ps -a; docker compose logs --tail=300 app postgres; exit 1; fi
  sleep 3
done
docker compose ps
echo "HomeLingua is ready on port 3000."
