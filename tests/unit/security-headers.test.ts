import { describe, expect, it } from "vitest";
import nextConfig from "@/next.config";

describe("security response headers", () => {
  it("applies the required browser protections to every route", async () => {
    const rules = await nextConfig.headers?.();
    const global = rules?.find((rule) => rule.source === "/(.*)");
    const headers = Object.fromEntries((global?.headers ?? []).map(({ key, value }) => [key.toLowerCase(), value]));

    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"]).toContain("microphone=(self)");
    expect(headers["cross-origin-opener-policy"]).toBe("same-origin");
    expect(headers["content-security-policy"]).toContain("default-src 'self'");
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["content-security-policy"]).toContain("object-src 'none'");
    expect(headers["content-security-policy"]).toContain("connect-src 'self'");
  });
});
