import { describe, expect, it } from "vitest";
import { FixedWindowRateLimiter } from "@/lib/rate-limit";
import { validateMagicBytes, validateUpload } from "@/lib/upload-security";
describe("operations security", () => {
  it("limits a fixed window and resets", () => { const limiter = new FixedWindowRateLimiter(2, 1000); expect(limiter.check("ip", 0).allowed).toBe(true); expect(limiter.check("ip", 1).allowed).toBe(true); expect(limiter.check("ip", 2).allowed).toBe(false); expect(limiter.check("ip", 1001).allowed).toBe(true); });
  it("rejects disguised and oversized uploads", () => { expect(() => validateUpload({ name: "voice.exe", type: "audio/webm", size: 10 })).toThrow("UPLOAD_EXTENSION_MISMATCH"); expect(() => validateUpload({ name: "voice.webm", type: "audio/webm", size: 20 }, 10)).toThrow("UPLOAD_SIZE_INVALID"); });
  it("checks file signatures", () => { expect(validateMagicBytes("image/png", new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(true); expect(() => validateMagicBytes("image/png", new Uint8Array([0x4d, 0x5a]))).toThrow("UPLOAD_SIGNATURE_MISMATCH"); });
});
