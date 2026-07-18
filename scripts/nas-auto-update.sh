#!/bin/sh
set -eu

PATH="/var/packages/Git/target/bin:/var/packages/ContainerManager/target/usr/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
export PATH
if command -v git >/dev/null 2>&1; then
  GIT_BIN="$(command -v git)"
elif [ -x /var/packages/Git/target/bin/git ]; then
  GIT_BIN=/var/packages/Git/target/bin/git
else
  echo "Git was not found. Install Synology Git Server package or add git to PATH." >&2
  exit 127
fi
export GIT_BIN

PROJECT_DIR="${PROJECT_DIR:-/volume2/docker/EnglishLearning}"
LOG_DIR="$PROJECT_DIR/logs"
LOG_FILE="$LOG_DIR/auto-update.log"
LOCK_DIR="$LOG_DIR/.auto-update.lock"

mkdir -p "$LOG_DIR"
exec >>"$LOG_FILE" 2>&1
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Checking GitHub for updates..."

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  echo "Another update is already running; skipped."
  exit 0
fi
trap 'rmdir "$LOCK_DIR" 2>/dev/null || true' EXIT INT TERM

cd "$PROJECT_DIR"
"$GIT_BIN" config --global --add safe.directory "$PROJECT_DIR" >/dev/null 2>&1 || true

if [ -n "$("$GIT_BIN" status --porcelain --untracked-files=no)" ]; then
  echo "Tracked files have local changes. Automatic deployment stopped to protect them."
  exit 2
fi

"$GIT_BIN" fetch origin main
LOCAL_COMMIT="$("$GIT_BIN" rev-parse HEAD)"
REMOTE_COMMIT="$("$GIT_BIN" rev-parse origin/main)"

if [ "$LOCAL_COMMIT" = "$REMOTE_COMMIT" ]; then
  echo "Already current: $LOCAL_COMMIT"
  exit 0
fi

echo "Deploying $LOCAL_COMMIT -> $REMOTE_COMMIT"
/bin/sh "$PROJECT_DIR/scripts/nas-deploy.sh"
DEPLOYED_COMMIT="$("$GIT_BIN" rev-parse HEAD)"

if [ "$DEPLOYED_COMMIT" != "$REMOTE_COMMIT" ]; then
  echo "Deployment ended on unexpected commit: $DEPLOYED_COMMIT"
  exit 3
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Deployment successful: $DEPLOYED_COMMIT"
