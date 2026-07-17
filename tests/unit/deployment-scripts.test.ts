import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("NAS deployment scripts", () => {
  const deploy = readFileSync("scripts/nas-deploy.sh", "utf8");
  const restore = readFileSync("scripts/restore.sh", "utf8");

  it("uses the configured published app port for readiness checks", () => {
    expect(deploy).toContain('APP_PORT="${APP_PORT:-3000}"');
    expect(deploy).toContain('http://127.0.0.1:${APP_PORT}/api/health/ready');
    expect(deploy).not.toContain("http://127.0.0.1:3000/api/health/ready");
  });

  it("creates restore staging before backup containers are started", () => {
    expect(deploy.indexOf("mkdir -p data/postgres uploads logs backups backups/restore-staging")).toBeLessThan(deploy.indexOf("docker compose --profile operations run --rm backup"));
  });

  it("requires explicit confirmation and a direct timestamped backup path", () => {
    expect(restore).toContain('CONFIRM_RESTORE:-');
    expect(restore).toContain("/backups/homelingua-[0-9]");
    expect(restore).toContain("sha256sum -c checksums.sha256");
  });
});
