#!/bin/sh
set -eu
LOG_DIR="${LOG_DIR:-/app/logs}"
RETENTION_DAYS="${LOG_RETENTION_DAYS:-30}"
find "$LOG_DIR" -type f -mtime "+$RETENTION_DAYS" -delete
echo "Removed application log files older than $RETENTION_DAYS days."
