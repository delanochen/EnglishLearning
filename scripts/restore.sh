#!/bin/sh
set -eu
if [ "${CONFIRM_RESTORE:-}" != "yes" ]; then echo "Restore refused. Set CONFIRM_RESTORE=yes after stopping the app and verifying the target." >&2; exit 2; fi
if [ "$#" -ne 1 ] || [ ! -d "$1" ]; then echo "Usage: CONFIRM_RESTORE=yes restore.sh /backups/homelingua-TIMESTAMP" >&2; exit 2; fi
BACKUP="$1"
(cd "$BACKUP" && sha256sum -c checksums.sha256)
export PGPASSWORD="$(cat /run/secrets/postgres_password)"
dropdb --if-exists --force "$PGDATABASE"
createdb "$PGDATABASE"
pg_restore --no-owner --no-privileges --exit-on-error --dbname="$PGDATABASE" "$BACKUP/database.dump"
mkdir -p /restore/uploads
tar -xzf "$BACKUP/uploads.tar.gz" -C /restore
echo "Database restored. Copy /restore/uploads to the host uploads directory only after inspecting it. Keep the original settings_encryption_key secret."
