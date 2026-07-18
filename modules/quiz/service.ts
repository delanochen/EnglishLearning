import { db } from "@/lib/db";
import { requireProfileAccess } from "@/modules/learner/access";

function rotate<T>(items: T[], offset: number) { return items.map((_, index) => items[(index + offset) % items.length]); }

export async function ensureQuizSession(userId: string, taskId: string) {
  const task = await db.dailyTask.findUniqueOrThrow({ where: { id: taskId } });
  if (task.taskType !== "QUIZ") throw new Error("NOT_A_QUIZ_TASK");
  await requireProfileAccess(userId, task.learnerProfileId);
  const existing = await db.quizSession.findUnique({ where: { taskId }, include: { questions: { orderBy: { order: "asc" } } } });
  if (existing) return existing;
  const learner = await db.learnerProfile.findUniqueOrThrow({ where: { id: task.learnerProfileId } });
  const vocabularyInclude = { meanings: { where: { locale: "zh-CN" }, orderBy: { senseOrder: "asc" as const }, take: 1 }, progress: { where: { learnerProfileId: learner.id } } };
  const learnedWords = await db.vocabulary.findMany({ where: { status: "PUBLISHED", ...(learner.cefrLevel ? { level:learner.cefrLevel } : {}), meanings: { some: { locale: "zh-CN" } }, progress: { some: { learnerProfileId: learner.id } } }, include: vocabularyInclude, orderBy: { word: "asc" }, take: 12 });
  const supplementalWords = learnedWords.length >= 7 ? [] : await db.vocabulary.findMany({ where: { status: "PUBLISHED", ...(learner.cefrLevel ? { level:learner.cefrLevel } : {}), id: { notIn: learnedWords.map((word) => word.id) }, meanings: { some: { locale: "zh-CN" } } }, include: vocabularyInclude, orderBy: { word: "asc" }, take: 12 - learnedWords.length });
  const words = [...learnedWords, ...supplementalWords];
  const mistakes = await db.mistakeRecord.findMany({ where: { learnerProfileId: learner.id, status: "OPEN" }, orderBy: { updatedAt: "desc" }, take: 3 });
  const pool = words.map((word) => word.meanings[0]!.definition);
  const questions: Array<{ type: string; prompt: string; options: string[]; answerKey: string; explanation: string | null; order: number }> = words.slice(0, Math.min(7, words.length)).map((word, index) => {
    const correct = word.meanings[0]!.definition;
    const distractors = rotate(pool.filter((value) => value !== correct), index).slice(0, 3);
    return { type: "VOCABULARY", prompt: `“${word.word}” 最合适的中文含义是？`, options: rotate([correct, ...distractors], index % Math.max(1, distractors.length + 1)), answerKey: correct, explanation: `${word.word}: ${word.definitionEn}`, order: index + 1 };
  });
  for (const mistake of mistakes) questions.push({ type: "MISTAKE_REVIEW", prompt: mistake.prompt, options: [], answerKey: mistake.correctAnswer, explanation: mistake.explanation, order: questions.length + 1 });
  if (!questions.length) throw new Error("QUIZ_CONTENT_UNAVAILABLE");
  return db.quizSession.create({ data: { learnerProfileId: learner.id, taskId, level: learner.cefrLevel, questions: { create: questions } }, include: { questions: { orderBy: { order: "asc" } } } });
}

export async function ensurePracticeQuizTask(userId:string,learnerProfileId:string){
  await requireProfileAccess(userId,learnerProfileId);const now=new Date();const taskDate=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()));
  const pending=await db.dailyTask.findFirst({where:{learnerProfileId,taskType:"QUIZ",status:"PENDING"},orderBy:{createdAt:"desc"}});if(pending)return pending;
  return db.dailyTask.create({data:{learnerProfileId,taskDate,taskType:"QUIZ",title:"自由综合小测验",description:"随时开始的新一轮自动判分练习",estimatedMinutes:10,xpReward:10,generationReason:"用户主动继续学习"}});
}
