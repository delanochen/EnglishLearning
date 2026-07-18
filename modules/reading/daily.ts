import { db } from "@/lib/db";
import { routedStructured } from "@/modules/ai/gateway";
import { readingArticleSchema } from "@/modules/ai/content-schemas";

const wordCounts = { PRE_A1: 100, A1: 140, A2: 220, B1: 350, B2: 520, C1: 700, C2: 900 } as const;

function todayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function ensureDailyReading(userId: string, learnerProfileId: string) {
  const assignmentDate = todayUtc();
  const existing = await db.dailyReadingAssignment.findFirst({
    where: { learnerProfileId, article: { progress: { none: { learnerProfileId, completedAt: { not: null } } } } },
    include: { article: { include: { progress: { where: { learnerProfileId } } } } }
    ,orderBy:{createdAt:"desc"}
  });
  if (existing) return existing;

  const learner = await db.learnerProfile.findUniqueOrThrow({
    where: { id: learnerProfileId },
    include: { familyMember: { select: { displayName: true, familyId: true } } }
  });
  if (!learner.cefrLevel) return null;

  let articleId: string | undefined;
  const generationSource = "AI";
  try {
    const request = {
      level: learner.cefrLevel,
      wordCount: wordCounts[learner.cefrLevel],
      audience: `${learner.ageBand.toLowerCase()} English learner`,
      interests: learner.interests,
      weakAreas: learner.weakAreas,
      goals: learner.goals,
      date: assignmentDate.toISOString().slice(0, 10),
      requirement: "Create a fresh daily reading lesson. Vary the topic from common textbook passages and include useful vocabulary, comprehension questions, oral retelling, and a short writing extension."
    };
    const output = await routedStructured("READING", {
      schema: readingArticleSchema,
      schemaName: "DailyReadingArticle",
      messages: [
        { role: "system", content: "You are a CEFR curriculum designer. Create original, copyright-safe American English reading lessons precisely at the requested CEFR level. Include a natural Chinese translation and varied answerable questions." },
        { role: "user", content: JSON.stringify(request) }
      ],
      temperature: 0.85,
      maxTokens: 5000
    }, userId);
    const article = await db.$transaction(async (tx) => {
      const row = await tx.readingArticle.create({ data: { title: output.title, body: output.body, translation: output.translation, level: learner.cefrLevel!, audience: output.audience, wordCount: output.body.trim().split(/\s+/).length, topic: output.topic, targetVocabulary: output.targetVocabulary, targetGrammar: output.targetGrammar, summary: output.summary, oralRetellingPrompt: output.oralRetellingPrompt, writingExtensionPrompt: output.writingExtensionPrompt, status: "PUBLISHED", aiGenerated: true } });
      await tx.readingQuestion.createMany({ data: output.questions.map((question, index) => ({ articleId: row.id, type: question.type, prompt: question.prompt, options: question.options ?? undefined, answerKey: question.answerKey, explanation: question.explanation, order: index + 1 })) });
      await tx.auditLog.create({ data: { actorUserId: userId, familyId: learner.familyMember.familyId, action: "DAILY_READING_GENERATED", resourceType: "ReadingArticle", resourceId: row.id, metadata: { learnerProfileId, level: learner.cefrLevel, assignmentDate: assignmentDate.toISOString() } } });
      return row;
    });
    articleId = article.id;
  } catch {
    return null;
  }
  if(!articleId)return null;

  return db.dailyReadingAssignment.create({
      data: { learnerProfileId, articleId, assignmentDate, generationSource },
      include: {
        article: {
          include: { progress: { where: { learnerProfileId } } }
        }
      }
    });
}
