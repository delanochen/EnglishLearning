import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("NAS deployment scripts", () => {
  const deploy = readFileSync("scripts/nas-deploy.sh", "utf8");
  const restore = readFileSync("scripts/restore.sh", "utf8");
  const autoUpdate = readFileSync("scripts/nas-auto-update.sh", "utf8");
  const wordnetImport = readFileSync("scripts/import-open-wordnet.sh", "utf8");

  it("keeps the Docker backup version aligned with the website version", () => {
    const version = JSON.parse(readFileSync("package.json", "utf8")).version;
    expect(readFileSync("docker-compose.yml", "utf8")).toContain(`APP_VERSION: \${APP_VERSION:-${version}}`);
  });

  it("uses the configured published app port for readiness checks", () => {
    expect(deploy).toContain('APP_PORT="${APP_PORT:-3000}"');
    expect(deploy).toContain('http://127.0.0.1:${APP_PORT}/api/health/ready');
    expect(deploy).not.toContain("http://127.0.0.1:3000/api/health/ready");
  });

  it("creates restore staging before backup containers are started", () => {
    expect(deploy.indexOf("mkdir -p data/postgres uploads logs backups backups/restore-staging")).toBeLessThan(deploy.indexOf("docker compose --profile operations run --rm backup"));
  });

  it("makes application bind mounts writable by the non-root container user",()=>{
    expect(deploy).toContain("chown -R 1001:1001 uploads logs backups");
  });

  it("creates persistent Redis and content worker directories", () => {
    expect(deploy).toContain("data/redis");
    expect(deploy).toContain("content-cache import-cache");
    const compose = readFileSync("docker-compose.yml", "utf8");
    expect(compose).toContain("content-worker:");
    expect(compose).toContain("redis:");
    expect(compose).not.toContain("6379:6379");
    expect(deploy).toContain("for service in redis content-worker");
    expect(deploy).toContain("docker inspect --format '{{.State.Health.Status}}'");
  });

  it("quotes Prisma configuration table names in the settings snapshot", () => {
    const backup = readFileSync("scripts/backup.sh", "utf8");
    for (const table of ["SystemSetting", "AIProvider", "AIModel", "AIUsageRoute", "AIUsageRouteModel"]) {
      expect(backup).toContain(`--table='public.\"${table}\"'`);
    }
  });

  it("backs up an empty or partially initialized database without matching-table or audit failures", () => {
    const backup = readFileSync("scripts/backup.sh", "utf8");
    expect(backup).toContain('CONFIG_TABLE_COUNT=');
    expect(backup).toContain('--schema-only');
    expect(backup).toContain('settings_snapshot=${SETTINGS_SNAPSHOT}');
    expect(backup).toContain("to_regclass");
    expect(backup).toContain("trap cleanup EXIT INT TERM");
  });

  it("updates deployment scripts before taking the pre-upgrade data backup", () => {
    expect(deploy.indexOf('"$GIT_BIN" pull --ff-only origin main')).toBeLessThan(deploy.indexOf("Creating pre-upgrade backup"));
    expect(deploy.indexOf("docker compose config >/dev/null")).toBeLessThan(deploy.indexOf("Creating pre-upgrade backup"));
  });

  it("hands root-created backups back to the non-root application user", () => {
    const backup = readFileSync("scripts/backup.sh", "utf8");
    expect(backup.indexOf('mv "$WORK" "$FINAL"')).toBeLessThan(backup.indexOf('chown -R 1001:1001 "$FINAL"'));
  });

  it("excludes an accidental nested repository from Docker and TypeScript builds", () => {
    expect(readFileSync(".dockerignore", "utf8")).toContain("/EnglishLearning");
    expect(JSON.parse(readFileSync("tsconfig.json", "utf8")).exclude).toContain("EnglishLearning");
  });

  it("requires explicit confirmation and a direct timestamped backup path", () => {
    expect(restore).toContain('CONFIRM_RESTORE:-');
    expect(restore).toContain("/backups/homelingua-[0-9]");
    expect(restore).toContain("sha256sum -c checksums.sha256");
  });

  it("auto-updates only when GitHub has a new commit and uses a deployment lock", () => {
    expect(autoUpdate).toContain('"$GIT_BIN" fetch origin main');
    expect(autoUpdate).toContain('mkdir "$LOCK_DIR"');
    expect(autoUpdate).toContain('scripts/nas-deploy.sh');
    expect(autoUpdate).toContain('"$GIT_BIN" status --porcelain --untracked-files=no');
    expect(autoUpdate).toContain('/var/packages/Git/target/bin');
  });

  it("notifies DSM only after the running version and commit are verified", () => {
    expect(autoUpdate).toContain('/api/health/live');
    expect(autoUpdate).toContain('DEPLOYED_VERSION');
    expect(autoUpdate).toContain('EXPECTED_VERSION');
    expect(autoUpdate.indexOf('if [ "$DEPLOYED_COMMIT" != "$REMOTE_COMMIT" ]')).toBeLessThan(autoUpdate.indexOf('notify_commit_once "$DEPLOYED_COMMIT"'));
    expect(autoUpdate).toContain('synodsmnotify');
    expect(autoUpdate).toContain('AUTO_UPDATE_NOTIFY_TARGET');
    expect(autoUpdate).toContain('last-notified-commit');
    expect(autoUpdate).toContain('Success notification will be retried on the next scheduled check.');
  });

  it("imports the attributed open wordnet through Docker secrets",()=>{
    expect(wordnetImport).toContain("/run/secrets/postgres_password");
    expect(wordnetImport).toContain("english-wordnet-2025.zip");
    expect(wordnetImport).toContain("import-open-wordnet.ts");
  });
});
