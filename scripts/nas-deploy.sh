#!/bin/sh
set -eu

PATH="/var/packages/Git/target/bin:/var/packages/ContainerManager/target/usr/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
export PATH
GIT_BIN="${GIT_BIN:-$(command -v git 2>/dev/null || true)}"
[ -n "$GIT_BIN" ] || { echo "Git was not found in the deployment environment." >&2; exit 127; }

PROJECT_DIR="${PROJECT_DIR:-/volume2/docker/EnglishLearning}"
APP_PORT="${APP_PORT:-3000}"
cd "$PROJECT_DIR"
mkdir -p logs
DEPLOY_LOCK_DIR="$PROJECT_DIR/logs/.auto-update.lock"
if [ "${DEPLOY_LOCK_HELD:-0}" != "1" ]; then
  if ! mkdir "$DEPLOY_LOCK_DIR" 2>/dev/null; then
    echo "Another deployment is already running; try again after it finishes." >&2
    exit 75
  fi
  trap 'rmdir "$DEPLOY_LOCK_DIR" 2>/dev/null || true' EXIT INT TERM
fi
for file in postgres_password auth_secret settings_encryption_key initial_admin_email initial_admin_password; do
  if [ ! -s "secrets/$file" ]; then echo "Missing or empty secret: $PROJECT_DIR/secrets/$file" >&2; exit 2; fi
done
chmod 700 secrets
chmod 644 secrets/*
mkdir -p data/postgres data/redis uploads logs backups backups/restore-staging content-cache import-cache
# The official redis:7.4-alpine image runs Redis as uid 999 / gid 1000.
# Synology creates bind-mount directories as root, so repair ownership before
# Compose starts Redis or AOF initialization will fail with Permission denied.
chown -R 999:1000 data/redis
chmod -R u+rwX,g+rwX data/redis
chown -R 1001:1001 uploads logs content-cache import-cache
chmod -R u+rwX,g+rwX uploads logs content-cache import-cache
# Backup jobs atomically rename *.partial directories. Only adjust the stable
# mount points here so a concurrent rename cannot make recursive chmod fail.
chown 1001:1001 backups backups/restore-staging
chmod u+rwX,g+rwX backups backups/restore-staging
"$GIT_BIN" config --global --add safe.directory "$PROJECT_DIR" >/dev/null 2>&1 || true
"$GIT_BIN" pull --ff-only origin main
HOMELINGUA_IMAGE_TAG="$("$GIT_BIN" rev-parse HEAD)"
export HOMELINGUA_IMAGE_TAG
echo "Deploying prebuilt image: ${HOMELINGUA_IMAGE:-ghcr.io/delanochen/englishlearning}:${HOMELINGUA_IMAGE_TAG}"
docker compose config >/dev/null
if ! docker compose pull app content-worker; then
  echo "The prebuilt GitHub image is not available yet. The current healthy deployment was left unchanged." >&2
  echo "Check the GitHub Actions 'Publish NAS image' job and GHCR package visibility." >&2
  exit 69
fi
if docker compose ps -q postgres 2>/dev/null | grep -q .; then
  echo "Creating pre-upgrade backup..."
  docker compose --profile operations run --rm backup
fi
# Remove app/worker containers explicitly before recreation. Interrupted
# Synology deployments can leave Docker's temporary rename containers behind,
# which otherwise cause "container name is already in use" conflicts.
docker compose rm -sf app content-worker >/dev/null 2>&1 || true
if ! docker compose up -d; then
  echo "Docker Compose failed to start the services." >&2
  docker compose ps -a
  docker compose logs --tail=300 redis app content-worker postgres
  exit 1
fi
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
