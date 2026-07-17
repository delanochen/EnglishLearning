"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSystemAdmin } from "@/modules/authorization/require-admin";
import { contentEditSchema, grammarExampleSchema, grammarExerciseSchema, grammarMetadataSchema, grammarPublishReadiness, listeningContentSchema, parseContrastLines, readingContentSchema, scenarioDialogueSchema, scenarioExerciseSchema, scenarioMetadataSchema, scenarioPublishReadiness, scenarioVocabularySchema, csv, lines } from "./content-schemas";

async function audit(actorUserId: string, action: string, resourceType: string, resourceId: string, metadata?: object) {
  await db.auditLog.create({ data: { actorUserId, action, resourceType, resourceId, metadata } });
}

export async function updateUserStatus(formData: FormData) {
  const actor = await requireSystemAdmin();
  const input = z.object({ userId: z.string().uuid(), status: z.enum(["ACTIVE", "DISABLED", "PENDING"]) }).parse(Object.fromEntries(formData));
  if (input.userId === actor.id && input.status !== "ACTIVE") throw new Error("CANNOT_DISABLE_SELF");
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: input.userId }, data: { status: input.status } });
    if (input.status === "DISABLED") await tx.session.deleteMany({ where: { userId: input.userId } });
  });
  await audit(actor.id, "USER_STATUS_UPDATED", "User", input.userId, { status: input.status });
  revalidatePath("/admin/users");
}

const contentInput = z.object({ type: z.enum(["vocabulary", "reading", "grammar", "scenario", "listening"]), id: z.string().uuid(), status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]) });
export async function updateContentStatus(formData: FormData) {
  const actor = await requireSystemAdmin(); const input = contentInput.parse(Object.fromEntries(formData));
  if (input.type === "vocabulary") await db.vocabulary.update({ where: { id: input.id }, data: { status: input.status } });
  if (input.type === "reading") await db.readingArticle.update({ where: { id: input.id }, data: { status: input.status } });
  if (input.type === "grammar") {
    if (input.status === "PUBLISHED") {
      const topic = await db.grammarTopic.findUniqueOrThrow({ where: { id: input.id }, include: { _count: { select: { examples: true, exercises: true } } } });
      const missing = grammarPublishReadiness({ ...topic._count, useCases: topic.useCases.length, commonErrors: topic.commonErrors.length });
      if (missing.length) throw new Error(`GRAMMAR_NOT_READY:${missing.join("；")}`);
    }
    await db.grammarTopic.update({ where: { id: input.id }, data: { status: input.status } });
  }
  if (input.type === "scenario") {
    if (input.status === "PUBLISHED") {
      const lesson = await db.scenarioLesson.findUniqueOrThrow({ where: { id: input.id }, include: { _count: { select: { dialogues: true, vocabulary: true, exercises: true } } } });
      const missing = scenarioPublishReadiness({ ...lesson._count, cultureTips: lesson.cultureTips.length, naturalExpressions: lesson.naturalExpressions.length });
      if (missing.length) throw new Error(`SCENARIO_NOT_READY:${missing.join("；")}`);
    }
    await db.scenarioLesson.update({ where: { id: input.id }, data: { status: input.status } });
  }
  if (input.type === "listening") await db.listeningExercise.update({ where: { id: input.id }, data: { status: input.status } });
  await audit(actor.id, "CONTENT_STATUS_UPDATED", input.type, input.id, { status: input.status }); revalidatePath("/admin/content");
}

export async function saveSystemSetting(formData: FormData) {
  const actor = await requireSystemAdmin();
  const input = z.object({ namespace: z.string().trim().min(1).max(40).regex(/^[a-z0-9_-]+$/i), key: z.string().trim().min(1).max(80).regex(/^[a-z0-9_.-]+$/i), value: z.string().trim().max(2000) }).parse(Object.fromEntries(formData));
  let value: unknown = input.value; try { value = JSON.parse(input.value); } catch { /* store plain text */ }
  await db.systemSetting.upsert({ where: { namespace_key: { namespace: input.namespace, key: input.key } }, update: { value: value as never, version: { increment: 1 } }, create: { namespace: input.namespace, key: input.key, value: value as never, isSensitive: false } });
  await audit(actor.id, "SYSTEM_SETTING_UPDATED", "SystemSetting", `${input.namespace}.${input.key}`); revalidatePath("/admin/settings");
}

export async function changeUserRole(formData: FormData) {
  const actor = await requireSystemAdmin(); const input = z.object({ userId: z.string().uuid(), roleId: z.string().uuid(), operation: z.enum(["assign", "remove"]) }).parse(Object.fromEntries(formData));
  const role = await db.role.findUniqueOrThrow({ where: { id: input.roleId } }); if (role.scope !== "SYSTEM") throw new Error("SYSTEM_ROLE_REQUIRED");
  if (input.userId === actor.id && role.code === "SYSTEM_ADMIN" && input.operation === "remove") throw new Error("CANNOT_REMOVE_OWN_ADMIN_ROLE");
  if (input.operation === "assign") { const exists = await db.userRole.findFirst({ where: { userId: input.userId, roleId: input.roleId, familyId: null } }); if (!exists) await db.userRole.create({ data: { userId: input.userId, roleId: input.roleId } }); }
  else await db.userRole.deleteMany({ where: { userId: input.userId, roleId: input.roleId, familyId: null } });
  await audit(actor.id, `ROLE_${input.operation.toUpperCase()}`, "UserRole", input.userId, { role: role.code }); revalidatePath("/admin/roles"); revalidatePath("/admin/users");
}

export async function createVocabulary(formData: FormData) {
  const actor=await requireSystemAdmin();const input=z.object({word:z.string().trim().min(1).max(80),phonetic:z.string().trim().max(80).optional(),partOfSpeech:z.string().trim().min(1).max(40),definitionEn:z.string().trim().min(1).max(500),definitionZh:z.string().trim().min(1).max(500),level:z.enum(["PRE_A1","A1","A2","B1","B2","C1"]),topic:z.string().trim().min(1).max(80)}).parse(Object.fromEntries(formData));const row=await db.vocabulary.create({data:{word:input.word,phonetic:input.phonetic||null,partOfSpeech:input.partOfSpeech,definitionEn:input.definitionEn,level:input.level,topic:input.topic,status:"DRAFT",meanings:{create:{locale:"zh-CN",definition:input.definitionZh}}}});await audit(actor.id,"CONTENT_CREATED","Vocabulary",row.id);revalidatePath("/admin/content");
}
export async function createGrammarTopic(formData: FormData) {
  const actor=await requireSystemAdmin();const input=z.object({slug:z.string().trim().min(1).max(80).regex(/^[a-z0-9-]+$/),title:z.string().trim().min(1).max(160),ruleEn:z.string().trim().min(1).max(3000),ruleZh:z.string().trim().min(1).max(3000),level:z.enum(["PRE_A1","A1","A2","B1","B2","C1"]),useCases:z.string().max(1000),commonErrors:z.string().max(1000)}).parse(Object.fromEntries(formData));const row=await db.grammarTopic.create({data:{slug:input.slug,title:input.title,ruleEn:input.ruleEn,ruleZh:input.ruleZh,level:input.level,status:"DRAFT",useCases:input.useCases.split("\n").map(x=>x.trim()).filter(Boolean),commonErrors:input.commonErrors.split("\n").map(x=>x.trim()).filter(Boolean)}});await audit(actor.id,"CONTENT_CREATED","GrammarTopic",row.id);revalidatePath("/admin/content");
}
export async function createScenarioLesson(formData: FormData) {
  const actor=await requireSystemAdmin();const input=z.object({category:z.string().trim().min(1).max(100),title:z.string().trim().min(1).max(160),intro:z.string().trim().min(1).max(3000),level:z.enum(["PRE_A1","A1","A2","B1","B2","C1"])}).parse(Object.fromEntries(formData));const row=await db.scenarioLesson.create({data:{...input,status:"DRAFT",cultureTips:[],misunderstandings:[],naturalExpressions:[],sourceType:"ORIGINAL",sourceNote:"管理员原创内容"}});await audit(actor.id,"CONTENT_CREATED","ScenarioLesson",row.id);revalidatePath("/admin/content");
}
export async function createReadingArticle(formData: FormData) {
  const actor = await requireSystemAdmin(); const input = readingContentSchema.parse(Object.fromEntries(formData));
  const row = await db.readingArticle.create({ data: { ...input, translation: input.translation || null, wordCount: input.body.split(/\s+/).length, targetVocabulary: csv(input.targetVocabulary), targetGrammar: csv(input.targetGrammar), status: "DRAFT", aiGenerated: false } });
  await audit(actor.id, "CONTENT_CREATED", "ReadingArticle", row.id); revalidatePath("/admin/content");
}
export async function createListeningExercise(formData: FormData) {
  const actor = await requireSystemAdmin(); const input = listeningContentSchema.parse(Object.fromEntries(formData));
  const row = await db.listeningExercise.create({ data: { ...input, translation: input.translation || null, audioUrl: input.audioUrl || null, status: "DRAFT" } });
  await audit(actor.id, "CONTENT_CREATED", "ListeningExercise", row.id); revalidatePath("/admin/content");
}
export async function updateContentDetails(formData: FormData) {
  const actor = await requireSystemAdmin(); const input = contentEditSchema.parse(Object.fromEntries(formData));
  if (input.type === "vocabulary") await db.$transaction(async (tx) => { await tx.vocabulary.update({ where: { id: input.id }, data: { word: input.title, definitionEn: input.primary, topic: input.topic || "general", level: input.level } }); await tx.vocabularyMeaning.upsert({ where: { vocabularyId_locale_senseOrder: { vocabularyId: input.id, locale: "zh-CN", senseOrder: 1 } }, update: { definition: input.secondary || "" }, create: { vocabularyId: input.id, locale: "zh-CN", senseOrder: 1, definition: input.secondary || "" } }); });
  if (input.type === "reading") await db.readingArticle.update({ where: { id: input.id }, data: { title: input.title, body: input.primary, translation: input.secondary || null, topic: input.topic || "general", level: input.level, wordCount: input.primary.split(/\s+/).length } });
  if (input.type === "grammar") await db.grammarTopic.update({ where: { id: input.id }, data: { title: input.title, ruleEn: input.primary, ruleZh: input.secondary || "", level: input.level } });
  if (input.type === "scenario") await db.scenarioLesson.update({ where: { id: input.id }, data: { title: input.title, intro: input.primary, category: input.topic || "general", level: input.level, version: { increment: 1 } } });
  if (input.type === "listening") await db.listeningExercise.update({ where: { id: input.id }, data: { title: input.title, transcript: input.primary, translation: input.secondary || null, topic: input.topic || "general", level: input.level } });
  await audit(actor.id, "CONTENT_UPDATED", input.type, input.id, { level: input.level }); revalidatePath("/admin/content");
}

export async function updateScenarioMetadata(formData: FormData) {
  const actor = await requireSystemAdmin(); const input = scenarioMetadataSchema.parse(Object.fromEntries(formData));
  await db.scenarioLesson.update({ where: { id: input.lessonId }, data: { category: input.category, title: input.title, intro: input.intro, level: input.level, cultureTips: lines(input.cultureTips), misunderstandings: lines(input.misunderstandings), naturalExpressions: lines(input.naturalExpressions), sourceNote: input.sourceNote || null, version: { increment: 1 } } });
  await audit(actor.id, "SCENARIO_METADATA_UPDATED", "ScenarioLesson", input.lessonId); revalidatePath(`/admin/content/scenarios/${input.lessonId}`); revalidatePath("/admin/content");
}

export async function addScenarioDialogue(formData: FormData) {
  const actor = await requireSystemAdmin(); const input = scenarioDialogueSchema.parse(Object.fromEntries(formData));
  const last = await db.scenarioDialogue.aggregate({ where: { lessonId: input.lessonId }, _max: { sequence: true } });
  const row = await db.scenarioDialogue.create({ data: { lessonId: input.lessonId, sequence: (last._max.sequence ?? 0) + 1, speaker: input.speaker, roleName: input.roleName, textEn: input.textEn, textZh: input.textZh || null, cameraCue: input.cameraCue || null } });
  await audit(actor.id, "SCENARIO_DIALOGUE_ADDED", "ScenarioDialogue", row.id, { lessonId: input.lessonId }); revalidatePath(`/admin/content/scenarios/${input.lessonId}`);
}

export async function addScenarioVocabulary(formData: FormData) {
  const actor = await requireSystemAdmin(); const input = scenarioVocabularySchema.parse(Object.fromEntries(formData));
  const last = await db.scenarioVocabulary.aggregate({ where: { lessonId: input.lessonId }, _max: { order: true } });
  const row = await db.scenarioVocabulary.create({ data: { lessonId: input.lessonId, order: (last._max.order ?? 0) + 1, word: input.word, meaningZh: input.meaningZh, example: input.example || null } });
  await audit(actor.id, "SCENARIO_VOCABULARY_ADDED", "ScenarioVocabulary", row.id, { lessonId: input.lessonId }); revalidatePath(`/admin/content/scenarios/${input.lessonId}`);
}

export async function addScenarioExercise(formData: FormData) {
  const actor = await requireSystemAdmin(); const input = scenarioExerciseSchema.parse(Object.fromEntries(formData));
  const options = lines(input.options); if (options.length < 2 || !options.includes(input.answerKey)) throw new Error("SCENARIO_OPTIONS_INVALID");
  const last = await db.scenarioExercise.aggregate({ where: { lessonId: input.lessonId }, _max: { order: true } });
  const row = await db.scenarioExercise.create({ data: { lessonId: input.lessonId, order: (last._max.order ?? 0) + 1, type: "MULTIPLE_CHOICE", prompt: input.prompt, answerKey: input.answerKey, options, explanation: input.explanation || null } });
  await audit(actor.id, "SCENARIO_EXERCISE_ADDED", "ScenarioExercise", row.id, { lessonId: input.lessonId }); revalidatePath(`/admin/content/scenarios/${input.lessonId}`);
}

export async function deleteScenarioItem(formData: FormData) {
  const actor = await requireSystemAdmin(); const input = z.object({ lessonId: z.string().uuid(), id: z.string().uuid(), type: z.enum(["dialogue", "vocabulary", "exercise"]) }).parse(Object.fromEntries(formData));
  if (input.type === "dialogue") await db.scenarioDialogue.deleteMany({ where: { id: input.id, lessonId: input.lessonId } });
  if (input.type === "vocabulary") await db.scenarioVocabulary.deleteMany({ where: { id: input.id, lessonId: input.lessonId } });
  if (input.type === "exercise") await db.scenarioExercise.deleteMany({ where: { id: input.id, lessonId: input.lessonId } });
  await audit(actor.id, "SCENARIO_ITEM_DELETED", input.type, input.id, { lessonId: input.lessonId }); revalidatePath(`/admin/content/scenarios/${input.lessonId}`);
}

export async function updateGrammarMetadata(formData: FormData) {
  const actor = await requireSystemAdmin(); const input = grammarMetadataSchema.parse(Object.fromEntries(formData));
  await db.grammarTopic.update({ where: { id: input.topicId }, data: { slug: input.slug, title: input.title, ruleEn: input.ruleEn, ruleZh: input.ruleZh, level: input.level, useCases: lines(input.useCases), commonErrors: lines(input.commonErrors), contrastExamples: parseContrastLines(input.contrastExamples) } });
  await audit(actor.id, "GRAMMAR_METADATA_UPDATED", "GrammarTopic", input.topicId); revalidatePath(`/admin/content/grammar/${input.topicId}`); revalidatePath("/admin/content");
}
export async function addGrammarExample(formData: FormData) {
  const actor = await requireSystemAdmin(); const input = grammarExampleSchema.parse(Object.fromEntries(formData));
  const row = await db.grammarExample.create({ data: { topicId: input.topicId, sentence: input.sentence, translation: input.translation || null, explanation: input.explanation || null, isError: input.isError === "on" } });
  await audit(actor.id, "GRAMMAR_EXAMPLE_ADDED", "GrammarExample", row.id, { topicId: input.topicId }); revalidatePath(`/admin/content/grammar/${input.topicId}`);
}
export async function addGrammarExercise(formData: FormData) {
  const actor = await requireSystemAdmin(); const input = grammarExerciseSchema.parse(Object.fromEntries(formData)); const options = lines(input.options);
  if (input.type === "MULTIPLE_CHOICE" && (options.length < 2 || !options.includes(input.answerKey))) throw new Error("GRAMMAR_OPTIONS_INVALID");
  const last = await db.grammarExercise.aggregate({ where: { topicId: input.topicId }, _max: { order: true } });
  const row = await db.grammarExercise.create({ data: { topicId: input.topicId, order: (last._max.order ?? 0) + 1, type: input.type, prompt: input.prompt, options: options.length ? options : undefined, answerKey: input.answerKey, explanation: input.explanation || null } });
  await audit(actor.id, "GRAMMAR_EXERCISE_ADDED", "GrammarExercise", row.id, { topicId: input.topicId }); revalidatePath(`/admin/content/grammar/${input.topicId}`);
}
export async function deleteGrammarItem(formData: FormData) {
  const actor = await requireSystemAdmin(); const input = z.object({ topicId: z.string().uuid(), id: z.string().uuid(), type: z.enum(["example", "exercise"]) }).parse(Object.fromEntries(formData));
  if (input.type === "example") await db.grammarExample.deleteMany({ where: { id: input.id, topicId: input.topicId } });
  else await db.grammarExercise.deleteMany({ where: { id: input.id, topicId: input.topicId } });
  await audit(actor.id, "GRAMMAR_ITEM_DELETED", input.type, input.id, { topicId: input.topicId }); revalidatePath(`/admin/content/grammar/${input.topicId}`);
}
export async function archiveUploadedFile(formData:FormData){const actor=await requireSystemAdmin();const id=z.string().uuid().parse(formData.get("id"));await db.uploadedFile.update({where:{id},data:{status:"ARCHIVED",deletedAt:new Date()}});await audit(actor.id,"FILE_ARCHIVED","UploadedFile",id);revalidatePath("/admin/files")}
