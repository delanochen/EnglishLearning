import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  requireSystemAdmin: vi.fn(),
  readFile: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/modules/authorization/require-admin", () => ({ requireSystemAdmin: mocks.requireSystemAdmin }));
vi.mock("node:fs/promises", async (original) => ({ ...(await original<typeof import("node:fs/promises")>()), readFile: mocks.readFile }));

import { POST as upload } from "@/app/api/uploads/route";
import { GET as downloadBackup } from "@/app/api/admin/backups/[name]/[file]/route";

describe("protected APIs", () => {
  beforeEach(() => {
    mocks.auth.mockReset();
    mocks.requireSystemAdmin.mockReset().mockResolvedValue({ id: "admin" });
    mocks.readFile.mockReset().mockResolvedValue(Buffer.from("backup"));
  });

  it("rejects an unauthenticated upload before parsing or writing the file", async () => {
    mocks.auth.mockResolvedValue(null);
    const response = await upload(new Request("http://localhost/api/uploads", { method: "POST" }));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "UNAUTHENTICATED" });
  });

  it("requires administrator authorization for backup downloads", async () => {
    mocks.requireSystemAdmin.mockRejectedValue(new Error("FORBIDDEN"));
    await expect(downloadBackup(new Request("http://localhost/api/admin/backups/x/y"), { params: Promise.resolve({ name: "homelingua-20260716T120000Z", file: "database.dump" }) })).rejects.toThrow("FORBIDDEN");
    expect(mocks.readFile).not.toHaveBeenCalled();
  });

  it("rejects path traversal and unknown backup files without reading disk", async () => {
    const response = await downloadBackup(new Request("http://localhost/api/admin/backups/x/y"), { params: Promise.resolve({ name: "../secrets", file: "settings_encryption_key" }) });
    expect(response.status).toBe(404);
    expect(mocks.readFile).not.toHaveBeenCalled();
  });
});
