import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireSystemAdmin: vi.fn(), createJob: vi.fn() }));
vi.mock("@/modules/authorization/require-admin", () => ({ requireSystemAdmin: mocks.requireSystemAdmin }));
vi.mock("@/modules/content-pipeline/imports", () => ({ createPublicImportJob: mocks.createJob }));
import { POST } from "@/app/api/admin/content/import/route";

describe("public import API", () => {
  beforeEach(() => { mocks.requireSystemAdmin.mockReset().mockResolvedValue({ id: "11111111-1111-4111-8111-111111111111" }); mocks.createJob.mockReset().mockResolvedValue({ job: { id: "job" } }); });
  it("checks administrator access before parsing imports", async () => {
    mocks.requireSystemAdmin.mockRejectedValue(new Error("FORBIDDEN"));
    await expect(POST(new Request("http://localhost/api/admin/content/import", { method: "POST", body: "{}" }))).rejects.toThrow("FORBIDDEN");
  });
  it("creates a bounded import job", async () => {
    const input = { importSourceId: "22222222-2222-4222-8222-222222222222", urls: ["https://data.example.org/open/a.txt"] };
    const response = await POST(new Request("http://localhost/api/admin/content/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }));
    expect(response.status).toBe(201);
    expect(mocks.createJob).toHaveBeenCalledWith(expect.objectContaining({ urls: input.urls, maxRetries: 1 }), "11111111-1111-4111-8111-111111111111");
  });
  it("rejects oversized batches", async () => {
    const response = await POST(new Request("http://localhost/api/admin/content/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ importSourceId: "22222222-2222-4222-8222-222222222222", urls: Array.from({ length: 101 }, (_, i) => `https://data.example.org/open/${i}`) }) }));
    expect(response.status).toBe(400); expect(mocks.createJob).not.toHaveBeenCalled();
  });
});
