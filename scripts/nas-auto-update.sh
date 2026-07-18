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
NOTIFIED_COMMIT_FILE="$LOG_DIR/last-notified-commit"

notify_deployment_success() {
  version="$1"
  commit="$2"
  notify_target="${AUTO_UPDATE_NOTIFY_TARGET:-@administrators}"
  notify_title="HomeLingua updated successfully"
  notify_message="HomeLingua v${version} was deployed successfully on $(hostname) at $(date '+%Y-%m-%d %H:%M:%S'). Commit: ${commit}."
  notify_bin=""
  for candidate in /usr/syno/bin/synodsmnotify /usr/syno/sbin/synodsmnotify; do
    if [ -x "$candidate" ]; then notify_bin="$candidate"; break; fi
  done
  if [ -z "$notify_bin" ] && command -v synodsmnotify >/dev/null 2>&1; then
    notify_bin="$(command -v synodsmnotify)"
  fi
  if [ -z "$notify_bin" ]; then
    echo "Deployment succeeded, but synodsmnotify was not found; success email was not sent."
    return 1
  fi
  if "$notify_bin" "$notify_target" "$notify_title" "$notify_message"; then
    echo "Success notification submitted to DSM target: $notify_target"
  else
    echo "Deployment succeeded, but DSM rejected the success notification." >&2
    return 1
  fi
}

verify_running_version() {
  LIVE_RESPONSE="$(curl -fsS "http://127.0.0.1:${APP_PORT:-3000}/api/health/live")"
  DEPLOYED_VERSION="$(printf '%s' "$LIVE_RESPONSE" | sed -n 's/.*"version":"\([^"]*\)".*/\1/p')"
  EXPECTED_VERSION="$(sed -n 's/^[[:space:]]*"version":[[:space:]]*"\([^"]*\)".*/\1/p' package.json | head -n 1)"
  [ -n "$DEPLOYED_VERSION" ] && [ "$DEPLOYED_VERSION" = "$EXPECTED_VERSION" ]
}

notify_commit_once() {
  commit="$1"
  last_notified="$(cat "$NOTIFIED_COMMIT_FILE" 2>/dev/null || true)"
  [ "$last_notified" != "$commit" ] || return 0
  if notify_deployment_success "$DEPLOYED_VERSION" "$commit"; then
    printf '%s\n' "$commit" > "$NOTIFIED_COMMIT_FILE"
  else
    echo "Success notification will be retried on the next scheduled check."
  fi
}

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
  if verify_running_version; then
    notify_commit_once "$LOCAL_COMMIT"
  else
    echo "Running version does not match the current repository; notification deferred."
  fi
  exit 0
fi

echo "Deploying $LOCAL_COMMIT -> $REMOTE_COMMIT"
/bin/sh "$PROJECT_DIR/scripts/nas-deploy.sh"
DEPLOYED_COMMIT="$("$GIT_BIN" rev-parse HEAD)"

if [ "$DEPLOYED_COMMIT" != "$REMOTE_COMMIT" ]; then
  echo "Deployment ended on unexpected commit: $DEPLOYED_COMMIT"
  exit 3
fi

if ! verify_running_version; then
  echo "Deployment version verification failed: expected=$EXPECTED_VERSION running=${DEPLOYED_VERSION:-unknown}" >&2
  exit 4
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Deployment successful: v$DEPLOYED_VERSION ($DEPLOYED_COMMIT)"
notify_commit_once "$DEPLOYED_COMMIT"
