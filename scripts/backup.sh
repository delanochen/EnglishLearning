#!/bin/sh
set -eu
export PGPASSWORD="$(cat /run/secrets/postgres_password)"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FINAL="/backups/homelingua-${STAMP}"
WORK="${FINAL}.partial"
mkdir -p "$WORK"
pg_dump --format=custom --no-owner --no-privileges --file="$WORK/database.dump" "$PGDATABASE"
tar -czf "$WORK/uploads.tar.gz" -C /source uploads
printf '%s\n' "version=${APP_VERSION:-unknown}" "created_at=${STAMP}" "database=${PGDATABASE}" > "$WORK/manifest.txt"
(cd "$WORK" && sha256sum database.dump uploads.tar.gz manifest.txt > checksums.sha256)
mv "$WORK" "$FINAL"
find /backups -mindepth 1 -maxdepth 1 -type d -name 'homelingua-*' -mtime "+${BACKUP_RETENTION_DAYS:-30}" -exec rm -rf {} \;
echo "Backup completed: $FINAL"
