#!/bin/sh
set -eu

PATH="/var/packages/Git/target/bin:/var/packages/ContainerManager/target/usr/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
export PATH
GIT_BIN="${GIT_BIN:-$(command -v git 2>/dev/null || true)}"
[ -n "$GIT_BIN" ] || { echo "Git was not found in the deployment environment." >&2; exit 127; }

PROJECT_DIR="${PROJECT_DIR:-/volume2/docker/EnglishLearning}"
APP_PORT="${APP_PORT:-3000}"
cd "$PROJECT_DIR"
for file in postgres_password auth_secret settings_encryption_key initial_admin_email initial_admin_password; do
  if [ ! -s "secrets/$file" ]; then echo "Missing or empty secret: $PROJECT_DIR/secrets/$file" >&2; exit 2; fi
done
chmod 700 secrets
chmod 644 secrets/*
mkdir -p data/postgres data/redis uploads logs backups backups/restore-staging content-cache import-cache
chown -R 1001:1001 uploads logs backups content-cache import-cache
chmod -R u+rwX,g+rwX uploads logs backups content-cache import-cache
"$GIT_BIN" config --global --add safe.directory "$PROJECT_DIR" >/dev/null 2>&1 || true
"$GIT_BIN" pull --ff-only origin main
docker compose config >/dev/null
if docker compose ps -q postgres 2>/dev/null | grep -q .; then
  echo "Creating pre-upgrade backup..."
  docker compose --profile operations run --rm backup
fi
docker compose build --pull app
docker compose up -d
attempt=0
until curl -fsS "http://127.0.0.1:${APP_PORT}/api/health/ready" >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 40 ]; then echo "Health check timed out." >&2; docker compose ps -a; docker compose logs --tail=300 app postgres; exit 1; fi
  sleep 3
done
for service in redis content-worker; do
  attempt=0
  container_id="$(docker compose ps -q "$service")"
  [ -n "$container_id" ] || { echo "$service container was not created." >&2; docker compose ps -a; exit 1; }
  until [ "$(docker inspect --format '{{.State.Health.Status}}' "$container_id" 2>/dev/null || true)" = "healthy" ]; do
    attempt=$((attempt + 1))
    if [ "$attempt" -ge 40 ]; then echo "$service health check timed out." >&2; docker compose ps -a; docker compose logs --tail=300 "$service"; exit 1; fi
    sleep 3
  done
done
docker compose ps
echo "HomeLingua is ready on port ${APP_PORT}."
