"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSystemAdmin } from "@/modules/authorization/require-admin";

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
  if (input.type === "grammar") await db.grammarTopic.update({ where: { id: input.id }, data: { status: input.status } });
  if (input.type === "scenario") await db.scenarioLesson.update({ where: { id: input.id }, data: { status: input.status } });
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
