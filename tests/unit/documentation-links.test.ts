import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const documents = ["README.md", "docs/ai-provider.md", "docs/architecture-plan.md", "docs/backup-restore.md", "docs/deployment.md", "docs/first-start.md", "docs/faq.md", "docs/security.md", "docs/upgrade-rollback.md"];

describe("documentation", () => {
  it("keeps every relative Markdown link valid", () => {
    const missing: string[] = [];
    for (const document of documents) {
      const content = readFileSync(resolve(document), "utf8");
      for (const match of content.matchAll(/\[[^\]]+\]\((?!https?:|#)([^)#]+)(?:#[^)]+)?\)/g)) {
        const target = resolve(dirname(document), decodeURIComponent(match[1]));
        if (!existsSync(target)) missing.push(`${document} -> ${match[1]}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
