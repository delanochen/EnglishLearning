import { describe, expect, it, vi } from "vitest";
import { recordMistakeResult } from "@/modules/mistakes/service";

const base = { learnerProfileId: "profile", familyId: "family", module: "READING", sourceType: "ReadingArticle", sourceId: "source", questionId: "question", prompt: "What happened?", answer: "Wrong", correctAnswer: "Right", explanation: "Read paragraph two." };

describe("cross-module mistake records", () => {
  it("opens or updates a mistake after an incorrect answer", async () => {
    const tx = { mistakeRecord: { upsert: vi.fn(), updateMany: vi.fn() } };
    await recordMistakeResult(tx as never, { ...base, correct: false });
    expect(tx.mistakeRecord.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ module: "READING" }), update: expect.objectContaining({ status: "OPEN", attemptCount: { increment: 1 } }) }));
    expect(tx.mistakeRecord.updateMany).not.toHaveBeenCalled();
  });

  it("marks the open mistake corrected after a correct retry", async () => {
    const tx = { mistakeRecord: { upsert: vi.fn(), updateMany: vi.fn() } };
    await recordMistakeResult(tx as never, { ...base, answer: "Right", correct: true });
    expect(tx.mistakeRecord.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { learnerProfileId: "profile", module: "READING", questionId: "question", status: "OPEN" }, data: expect.objectContaining({ status: "CORRECTED" }) }));
    expect(tx.mistakeRecord.upsert).not.toHaveBeenCalled();
  });
});
