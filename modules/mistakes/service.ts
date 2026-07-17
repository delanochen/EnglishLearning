import type { Prisma } from "@prisma/client";

type MistakeInput = { learnerProfileId: string; familyId: string; module: string; sourceType: string; sourceId: string; questionId: string; prompt: string; answer: string; correctAnswer: string; explanation?: string | null; correct: boolean };

export async function recordMistakeResult(tx: Prisma.TransactionClient, input: MistakeInput) {
  const key = { learnerProfileId_module_questionId: { learnerProfileId: input.learnerProfileId, module: input.module, questionId: input.questionId } };
  if (input.correct) {
    await tx.mistakeRecord.updateMany({ where: { ...key.learnerProfileId_module_questionId, status: "OPEN" }, data: { status: "CORRECTED", correctedAt: new Date(), answer: input.answer, attemptCount: { increment: 1 } } });
    return;
  }
  await tx.mistakeRecord.upsert({ where: key, update: { answer: input.answer, correctAnswer: input.correctAnswer, explanation: input.explanation, prompt: input.prompt, sourceType: input.sourceType, sourceId: input.sourceId, status: "OPEN", correctedAt: null, attemptCount: { increment: 1 } }, create: { learnerProfileId: input.learnerProfileId, familyId: input.familyId, module: input.module, sourceType: input.sourceType, sourceId: input.sourceId, questionId: input.questionId, prompt: input.prompt, answer: input.answer, correctAnswer: input.correctAnswer, explanation: input.explanation } });
}
