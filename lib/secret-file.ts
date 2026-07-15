import { readFile } from "node:fs/promises";

export async function readSecret(name: string, fallbackEnv?: string) {
  const path = `/run/secrets/${name}`;
  try { return (await readFile(path, "utf8")).trim(); }
  catch {
    if (fallbackEnv && process.env[fallbackEnv]) return process.env[fallbackEnv]!.trim();
    throw new Error(`Required secret is missing: ${name}`);
  }
}
