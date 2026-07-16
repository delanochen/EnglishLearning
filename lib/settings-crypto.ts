import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { readSecret } from "@/lib/secret-file";

export type EncryptedSetting = { ciphertext: string; iv: string; authTag: string; keyVersion: number };

export function decodeEncryptionKey(value: string) {
  const key = Buffer.from(value.trim(), "base64");
  if (key.length !== 32) throw new Error("settings_encryption_key must decode to exactly 32 bytes");
  return key;
}

export function encryptSetting(plaintext: string, key: Buffer, keyVersion = 1): EncryptedSetting {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return { ciphertext: ciphertext.toString("base64"), iv: iv.toString("base64"), authTag: cipher.getAuthTag().toString("base64"), keyVersion };
}

export function decryptSetting(value: EncryptedSetting, key: Buffer) {
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(value.iv, "base64"));
  decipher.setAuthTag(Buffer.from(value.authTag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(value.ciphertext, "base64")), decipher.final()]).toString("utf8");
}

export async function getSettingsEncryptionKey() {
  return decodeEncryptionKey(await readSecret("settings_encryption_key", "SETTINGS_ENCRYPTION_KEY"));
}

export function maskApiKey(hasKey: boolean) { return hasKey ? "••••••••••••" : "未设置"; }
