import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const learnerPages = [
  "app/(protected)/dashboard/page.tsx",
  "app/(protected)/tasks/page.tsx",
  "app/(protected)/placement/page.tsx",
  "app/(protected)/plans/page.tsx",
  "app/(protected)/reports/page.tsx",
  "app/(protected)/learn/vocabulary/page.tsx",
  "app/(protected)/learn/reading/page.tsx",
  "app/(protected)/learn/reading/[id]/page.tsx",
  "app/(protected)/learn/listening/page.tsx",
  "app/(protected)/learn/speaking/page.tsx",
  "app/(protected)/learn/grammar/page.tsx",
  "app/(protected)/learn/grammar/[id]/page.tsx",
  "app/(protected)/learn/writing/page.tsx",
  "app/(protected)/learn/scenarios/page.tsx",
  "app/(protected)/learn/scenarios/[id]/page.tsx",
  "app/(protected)/learn/tutor/page.tsx",
];

describe("single active learner flow", () => {
  it("forces learner routes through the profile selection cookie", async () => {
    const middleware = await readFile(path.resolve("middleware.ts"), "utf8");
    expect(middleware).toContain('request.cookies.has("homelingua_active_profile")');
    expect(middleware).toContain('new URL("/profiles", request.url)');
  });

  it("uses the active-profile cookie on every learner page without embedded member switchers", async () => {
    for (const relative of learnerPages) {
      const source = await readFile(path.resolve(relative), "utf8");
      expect(source, relative).not.toContain("ProfilePicker");
      expect(source, relative).not.toMatch(/[?&]profile=/);
      expect(source, relative).toContain("getActiveProfile");
    }
  });
});
