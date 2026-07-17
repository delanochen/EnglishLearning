import { describe, expect, it } from "vitest";
import { contentEditSchema, csv, listeningContentSchema, readingContentSchema } from "@/modules/admin/content-schemas";

describe("admin content schemas", () => {
  it("normalizes target lists for manually authored reading lessons", () => {
    expect(csv(" travel, check in, , luggage ")).toEqual(["travel", "check in", "luggage"]);
    expect(readingContentSchema.parse({ title: "Airport", body: "This is a sufficiently long graded reading passage.", level: "A2", audience: "adult", topic: "travel" }).level).toBe("A2");
  });

  it("accepts listening drafts with an optional audio URL", () => {
    expect(listeningContentSchema.parse({ title: "At school", transcript: "Good morning. How can I help you today?", translation: "早上好。", level: "B1", topic: "school", audioUrl: "" }).audioUrl).toBe("");
  });

  it("rejects invalid content edits", () => {
    expect(() => contentEditSchema.parse({ id: "bad", type: "reading", title: "", primary: "x", level: "A9" })).toThrow();
  });
});
