import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireSystemAdmin: vi.fn(), ensure: vi.fn(), start: vi.fn(), status: vi.fn() }));
vi.mock("@/modules/authorization/require-admin", () => ({ requireSystemAdmin: mocks.requireSystemAdmin }));
vi.mock("@/modules/content-pipeline/initialization", () => ({ ensureInitializationPlan: mocks.ensure, startInitializationJobs: mocks.start, initializationStatus: mocks.status }));
import { GET, POST } from "@/app/api/admin/content/initialize/route";

describe("content initialization API", () => {
  beforeEach(() => {
    mocks.requireSystemAdmin.mockReset().mockResolvedValue({ id: "admin" });
    mocks.ensure.mockReset().mockResolvedValue({ created: 2, jobs: [] });
    mocks.start.mockReset().mockResolvedValue(2);
    mocks.status.mockReset().mockResolvedValue({ total: 0, completed: 0, failed: 0, progress: 0, jobs: [] });
  });
  it("requires administrator access before returning status", async () => {
    mocks.requireSystemAdmin.mockRejectedValue(new Error("FORBIDDEN"));
    await expect(GET()).rejects.toThrow("FORBIDDEN");
  });
  it("plans inventory without starting AI jobs", async () => {
    const response = await POST(new Request("http://localhost/api/admin/content/initialize", { method: "POST", body: JSON.stringify({ action: "PLAN" }) }));
    expect(response.status).toBe(200); expect(mocks.ensure).toHaveBeenCalledWith({ actorUserId: "admin" }); expect(mocks.start).not.toHaveBeenCalled();
  });
  it("requires the exact START confirmation", async () => {
    const rejected = await POST(new Request("http://localhost/api/admin/content/initialize", { method: "POST", body: JSON.stringify({ action: "START", confirmation: "start" }) }));
    expect(rejected.status).toBe(400); expect(mocks.start).not.toHaveBeenCalled();
    const accepted = await POST(new Request("http://localhost/api/admin/content/initialize", { method: "POST", body: JSON.stringify({ action: "START", confirmation: "START" }) }));
    expect(accepted.status).toBe(200); expect(mocks.start).toHaveBeenCalledWith("admin");
  });
});
