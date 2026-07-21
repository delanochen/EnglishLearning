import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireSystemAdmin: vi.fn(), decide: vi.fn() }));
vi.mock("@/modules/authorization/require-admin", () => ({ requireSystemAdmin: mocks.requireSystemAdmin }));
vi.mock("@/modules/content-pipeline/reviews", () => ({ decideContentReview: mocks.decide }));
import { POST } from "@/app/api/admin/content/review/bulk/route";

describe("content review bulk API", () => {
  beforeEach(() => { mocks.requireSystemAdmin.mockReset().mockResolvedValue({ id: "11111111-1111-4111-8111-111111111111" }); mocks.decide.mockReset().mockResolvedValue({ id: "review" }); });
  it("requires an administrator", async () => {
    mocks.requireSystemAdmin.mockRejectedValue(new Error("FORBIDDEN"));
    await expect(POST(new Request("http://localhost/api/admin/content/review/bulk", { method: "POST", body: "{}" }))).rejects.toThrow("FORBIDDEN");
  });
  it("approves a bounded review selection", async () => {
    const id = "22222222-2222-4222-8222-222222222222";
    const response = await POST(new Request("http://localhost/api/admin/content/review/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [id], decision: "APPROVED" }) }));
    expect(response.status).toBe(200);
    expect(mocks.decide).toHaveBeenCalledWith(id, "APPROVED", "11111111-1111-4111-8111-111111111111", undefined);
  });
  it("requires a reason when rejecting", async () => {
    const id = "22222222-2222-4222-8222-222222222222";
    const response = await POST(new Request("http://localhost/api/admin/content/review/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [id], decision: "REJECTED" }) }));
    expect(response.status).toBe(400);
    expect(mocks.decide).not.toHaveBeenCalled();
  });
});
