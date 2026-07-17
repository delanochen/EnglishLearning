"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { requireProfileAccess } from "@/modules/learner/access";
import { completeTodayTaskForModule } from "@/modules/tasks/module-completion";
import { calculateReview } from "./review";
import { evaluateAchievements } from "@/modules/achievements/service";
import { gameScore, normalizeAnswer, weekStart, type GameAnswer } from "./game";

export async function reviewVocabulary(formData: FormData) {
  const session = await auth(); if (!session?.user.id) throw new Error("UNAUTHENTICATED");
  const input = z.object({ profileId: z.string().uuid(), vocabularyId: z.string().uuid(), quality: z.coerce.number().int().min(0).max(5) }).parse(Object.fromEntries(formData));
  const profile = await requireProfileAccess(session.user.id, input.profileId);
  const current = await db.userVocabularyProgress.upsert({
    where: { learnerProfileId_vocabularyId: { learnerProfileId: input.profileId, vocabularyId: input.vocabularyId } }, update: {},
    create: { learnerProfileId: input.profileId, vocabularyId: input.vocabularyId }
  });
  const next = calculateReview({ quality: input.quality, easeFactor: current.easeFactor, intervalDays: current.intervalDays, consecutiveCorrect: current.consecutiveCorrect, mastery: current.mastery });
  const now = new Date(); const nextReviewAt = new Date(now); nextReviewAt.setUTCDate(nextReviewAt.getUTCDate() + next.intervalDays);
  await db.$transaction([
    db.userVocabularyProgress.update({ where: { id: current.id }, data: { state: next.state, firstLearnedAt: current.firstLearnedAt ?? now, lastReviewedAt: now, nextReviewAt, correctCount: { increment: next.correct ? 1 : 0 }, incorrectCount: { increment: next.correct ? 0 : 1 }, mastery: next.mastery, easeFactor: next.easeFactor, intervalDays: next.intervalDays, consecutiveCorrect: next.consecutiveCorrect } }),
    db.reviewSchedule.create({ data: { progressId: current.id, scheduledAt: current.nextReviewAt ?? now, completedAt: now, result: next.correct, quality: next.quality, oldInterval: current.intervalDays, newInterval: next.intervalDays, oldEase: current.easeFactor, newEase: next.easeFactor } }),
    db.learningActivity.create({ data: { learnerProfileId: input.profileId, familyId: profile.familyId, activityType: "VOCAB_REVIEW", module: "VOCABULARY", score: next.quality / 5, sourceType: "Vocabulary", sourceId: input.vocabularyId } })
  ]);
  revalidatePath("/learn/vocabulary");
}

export async function completeVocabularySession(profileId: string) {
  const session = await auth(); if (!session?.user.id) throw new Error("UNAUTHENTICATED");
  const input = z.string().uuid().parse(profileId);
  await requireProfileAccess(session.user.id, input);
  await completeTodayTaskForModule(session.user.id, input, "VOCABULARY");
  revalidatePath("/tasks"); revalidatePath("/dashboard"); revalidatePath("/learn/vocabulary");
}

export async function submitVocabularyGame(formData:FormData){
  const session=await auth();if(!session?.user.id)throw new Error("UNAUTHENTICATED");
  const input=z.object({profileId:z.string().uuid(),mode:z.enum(["DAILY","WEEKLY"]),answers:z.string().transform(value=>JSON.parse(value)).pipe(z.array(z.object({vocabularyId:z.string().uuid(),questionType:z.enum(["MEANING","AUDIO","SPELLING","CONTEXT"]),answer:z.string().max(200),responseMs:z.number().int().min(0).max(300000)})).min(1).max(100))}).parse(Object.fromEntries(formData)) as {profileId:string;mode:"DAILY"|"WEEKLY";answers:GameAnswer[]};
  const profile=await requireProfileAccess(session.user.id,input.profileId);const ids=[...new Set(input.answers.map(answer=>answer.vocabularyId))];const words=await db.vocabulary.findMany({where:{id:{in:ids},status:"PUBLISHED"},select:{id:true,word:true,definitionEn:true}});const lookup=new Map(words.map(word=>[word.id,word]));if(words.length!==ids.length)throw new Error("VOCABULARY_FORBIDDEN");
  const judged=input.answers.map(answer=>({answer,word:lookup.get(answer.vocabularyId)!,correct:normalizeAnswer(answer.answer)===normalizeAnswer(lookup.get(answer.vocabularyId)!.word)}));const summary=gameScore(judged.map(item=>item.correct));const now=new Date();const periodStart=input.mode==="WEEKLY"?weekStart(now):new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()));
  const game=await db.$transaction(async tx=>{
    const row=await tx.vocabularyGameSession.create({data:{learnerProfileId:input.profileId,mode:input.mode,periodStart,totalQuestions:judged.length,correctAnswers:summary.correct,maxStreak:summary.maxStreak,score:summary.score,earnedXp:summary.earnedXp}});
    await tx.vocabularyGameAnswer.createMany({data:judged.map(item=>({sessionId:row.id,vocabularyId:item.word.id,questionType:item.answer.questionType,answer:item.answer.answer,isCorrect:item.correct,responseMs:item.answer.responseMs}))});
    for(const item of judged){
      const current=await tx.userVocabularyProgress.upsert({where:{learnerProfileId_vocabularyId:{learnerProfileId:input.profileId,vocabularyId:item.word.id}},update:{},create:{learnerProfileId:input.profileId,vocabularyId:item.word.id}});const next=calculateReview({quality:item.correct?5:1,easeFactor:current.easeFactor,intervalDays:current.intervalDays,consecutiveCorrect:current.consecutiveCorrect,mastery:current.mastery});const nextReviewAt=new Date(now);nextReviewAt.setUTCDate(nextReviewAt.getUTCDate()+next.intervalDays);
      await tx.userVocabularyProgress.update({where:{id:current.id},data:{state:next.state,firstLearnedAt:current.firstLearnedAt??now,lastReviewedAt:now,nextReviewAt,correctCount:{increment:item.correct?1:0},incorrectCount:{increment:item.correct?0:1},mastery:next.mastery,easeFactor:next.easeFactor,intervalDays:next.intervalDays,consecutiveCorrect:next.consecutiveCorrect}});
      if(item.correct)await tx.mistakeRecord.updateMany({where:{learnerProfileId:input.profileId,module:"VOCABULARY",questionId:item.word.id,status:"OPEN"},data:{status:"CORRECTED",correctedAt:now,attemptCount:{increment:1}}});else await tx.mistakeRecord.upsert({where:{learnerProfileId_module_questionId:{learnerProfileId:input.profileId,module:"VOCABULARY",questionId:item.word.id}},update:{answer:item.answer.answer,correctAnswer:item.word.word,status:"OPEN",attemptCount:{increment:1},correctedAt:null},create:{learnerProfileId:input.profileId,familyId:profile.familyId,module:"VOCABULARY",sourceType:"VocabularyGameSession",sourceId:row.id,questionId:item.word.id,prompt:`${item.answer.questionType}: ${item.word.definitionEn}`,answer:item.answer.answer,correctAnswer:item.word.word}});
    }
    await tx.learnerProfile.update({where:{id:input.profileId},data:{totalXp:{increment:summary.earnedXp}}});await tx.learningActivity.create({data:{learnerProfileId:input.profileId,familyId:profile.familyId,activityType:input.mode==="WEEKLY"?"VOCAB_WEEKLY_EXAM":"VOCAB_GAME",module:"VOCABULARY",durationSeconds:Math.round(input.answers.reduce((sum,item)=>sum+item.responseMs,0)/1000),score:summary.correct/judged.length,sourceType:"VocabularyGameSession",sourceId:row.id}});return row;
  });
  await completeTodayTaskForModule(session.user.id,input.profileId,"VOCABULARY",summary.correct/judged.length,Math.round(input.answers.reduce((sum,item)=>sum+item.responseMs,0)/1000));await evaluateAchievements(input.profileId);revalidatePath("/learn/vocabulary");revalidatePath("/dashboard");revalidatePath("/achievements");
  return{id:game.id,...summary,total:judged.length};
}
