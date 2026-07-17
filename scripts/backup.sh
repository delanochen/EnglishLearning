#!/bin/sh
set -eu
if [ "$(id -u)" = "0" ]; then chown 1001:1001 /backups; fi
export PGPASSWORD="$(cat /run/secrets/postgres_password)"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FINAL="/backups/homelingua-${STAMP}"
WORK="${FINAL}.partial"
cleanup() { [ ! -d "$WORK" ] || rm -rf "$WORK"; }
trap cleanup EXIT INT TERM
mkdir -p "$WORK"
pg_dump --format=custom --no-owner --no-privileges --file="$WORK/database.dump" "$PGDATABASE"
CONFIG_TABLE_COUNT="$(psql --tuples-only --no-align --command="SELECT count(*) FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relname IN ('SystemSetting','AIProvider','AIModel','AIUsageRoute','AIUsageRouteModel')")"
if [ "$CONFIG_TABLE_COUNT" = "5" ]; then
  pg_dump --format=custom --no-owner --no-privileges \
    --table='public."SystemSetting"' \
    --table='public."AIProvider"' \
    --table='public."AIModel"' \
    --table='public."AIUsageRoute"' \
    --table='public."AIUsageRouteModel"' \
    --file="$WORK/settings.dump" "$PGDATABASE"
  SETTINGS_SNAPSHOT="complete"
else
  echo "Application configuration tables are not initialized; writing a valid schema-only settings snapshot."
  pg_dump --format=custom --schema-only --no-owner --no-privileges --file="$WORK/settings.dump" "$PGDATABASE"
  SETTINGS_SNAPSHOT="schema-only"
fi
SOURCE_ROOT="${BACKUP_SOURCE_ROOT:-/source}"
tar -czf "$WORK/uploads.tar.gz" -C "$SOURCE_ROOT" uploads
printf '%s\n' "version=${APP_VERSION:-unknown}" "created_at=${STAMP}" "database=${PGDATABASE}" "settings_snapshot=${SETTINGS_SNAPSHOT}" > "$WORK/manifest.txt"
(cd "$WORK" && sha256sum database.dump settings.dump uploads.tar.gz manifest.txt > checksums.sha256)
mv "$WORK" "$FINAL"
trap - EXIT INT TERM
if [ "$(id -u)" = "0" ]; then chown -R 1001:1001 "$FINAL"; fi
if [ "$(psql --tuples-only --no-align --command="SELECT to_regclass('public.\"AuditLog\"') IS NOT NULL")" = "t" ]; then
  psql --set=ON_ERROR_STOP=1 --set=resource="$FINAL" <<'SQL'
INSERT INTO "AuditLog" ("id", "action", "resourceType", "resourceId", "metadata", "createdAt")
VALUES (gen_random_uuid(), 'BACKUP_CREATED', 'Backup', :'resource', jsonb_build_object('source', 'operations-container'), now());
SQL
else
  echo "AuditLog is not initialized; backup completed without a database audit row."
fi
find /backups -mindepth 1 -maxdepth 1 -type d -name 'homelingua-*' -mtime "+${BACKUP_RETENTION_DAYS:-30}" -exec rm -rf {} \;
echo "Backup completed: $FINAL"
