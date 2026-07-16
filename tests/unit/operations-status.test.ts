import { describe, expect, it } from "vitest"; import { formatBytes } from "@/modules/operations/status";
describe("operations status", () => { it("formats storage sizes", () => { expect(formatBytes(0)).toBe("0 B"); expect(formatBytes(1536)).toBe("1.5 KB"); expect(formatBytes(1024 * 1024)).toBe("1.0 MB"); }); });
