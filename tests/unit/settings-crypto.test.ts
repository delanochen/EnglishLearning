import { describe, expect, it } from "vitest";
import { decodeEncryptionKey, decryptSetting, encryptSetting, maskApiKey } from "@/lib/settings-crypto";

describe("settings encryption", () => {
  it("round trips with AES-256-GCM", () => {
    const key = decodeEncryptionKey(Buffer.alloc(32, 7).toString("base64"));
    const encrypted = encryptSetting("secret-api-key", key);
    expect(encrypted.ciphertext).not.toContain("secret-api-key");
    expect(decryptSetting(encrypted, key)).toBe("secret-api-key");
  });
  it("rejects invalid key length and masks values", () => {
    expect(() => decodeEncryptionKey(Buffer.alloc(16).toString("base64"))).toThrow();
    expect(maskApiKey(true)).not.toContain("api");
  });
});
