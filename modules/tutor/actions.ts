"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { routedChat } from "@/modules/ai/gateway";
import { requireProfileAccess } from "@/modules/learner/access";
import { completeTodayTaskForModule } from "@/modules/tasks/module-completion";
import { buildTutorSystemPrompt } from "./prompt";

const createSchema = z.object({ profileId: z.string().uuid(), topic: z.string().trim().min(2).max(120), teacherStyle: z.enum(["GENTLE", "STRICT", "CHILD", "ACADEMIC", "US_LIFE", "WORKPLACE"]) });
const messageSchema = z.object({ conversationId: z.string().uuid(), content: z.string().trim().min(1).max(4000) });

export async function createConversation(formData: FormData) {
  const session = await auth(); if (!session?.user.id) throw new Error("UNAUTHENTICATED");
  const input = createSchema.parse(Object.fromEntries(formData));
  await requireProfileAccess(session.user.id, input.profileId);
  const profile = await db.learnerProfile.findUniqueOrThrow({ where: { id: input.profileId } });
  const conversation = await db.aIConversation.create({ data: { learnerProfileId: input.profileId, topic: input.topic, teacherStyle: input.teacherStyle, levelSnapshot: profile.cefrLevel } });
  redirect(`/learn/tutor?profile=${input.profileId}&conversation=${conversation.id}`);
}

export async function sendTutorMessage(formData: FormData) {
  const session = await auth(); if (!session?.user.id) throw new Error("UNAUTHENTICATED");
  const input = messageSchema.parse(Object.fromEntries(formData));
  const conversation = await db.aIConversation.findUniqueOrThrow({ where: { id: input.conversationId }, include: { messages: { orderBy: { sequence: "asc" }, take: 30 }, learnerProfile: true } });
  const accessibleProfile = await requireProfileAccess(session.user.id, conversation.learnerProfileId);
  const nextSequence = (conversation.messages.at(-1)?.sequence ?? 0) + 1;
  await db.aIMessage.create({ data: { conversationId: conversation.id, role: "user", content: input.content, sequence: nextSequence } });
  const style = { GENTLE: "gentle and encouraging", STRICT: "strict and correction-focused", CHILD: "child-friendly", ACADEMIC: "US high-school academic", US_LIFE: "practical US life English", WORKPLACE: "professional workplace English" }[conversation.teacherStyle];
  const level = conversation.learnerProfile.cefrLevel?.replace("_", "-") ?? "A1";
  const immersion = (await cookies()).get("ui_locale")?.value === "en";
  let text: string; let inputTokens: number | undefined; let outputTokens: number | undefined;
  try {
    const response = await routedChat("TUTOR", { messages: [{ role: "system", content: buildTutorSystemPrompt(style, level, conversation.topic, immersion) }, ...conversation.messages.map((message) => ({ role: message.role as "user" | "assistant", content: message.content })), { role: "user", content: input.content }] }, session.user.id);
    text = response.text; inputTokens = response.inputTokens; outputTokens = response.outputTokens;
  } catch { text = "AI 老师暂时不可用。请让系统管理员在“管理后台 → AI 模型管理”中配置并测试 TUTOR 用途路由。"; }
  await db.$transaction([
    db.aIMessage.create({ data: { conversationId: conversation.id, role: "assistant", content: text, sequence: nextSequence + 1, inputTokens, outputTokens } }),
    db.aIConversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date() } }),
    db.learningActivity.create({ data: { learnerProfileId: conversation.learnerProfileId, familyId: accessibleProfile.familyId, activityType: "AI_CHAT", module: "TUTOR", sourceType: "AIConversation", sourceId: conversation.id } })
  ]);
  await completeTodayTaskForModule(session.user.id, conversation.learnerProfileId, "AI_TUTOR");
  revalidatePath("/learn/tutor");
}

export async function toggleMessageReview(formData: FormData) {
  const session = await auth(); if (!session?.user.id) throw new Error("UNAUTHENTICATED");
  const id = z.string().uuid().parse(formData.get("messageId"));
  const message = await db.aIMessage.findUniqueOrThrow({ where: { id }, include: { conversation: true } });
  await requireProfileAccess(session.user.id, message.conversation.learnerProfileId);
  await db.aIMessage.update({ where: { id }, data: { savedForReview: !message.savedForReview } });
  revalidatePath("/learn/tutor");
}

export async function archiveConversation(formData:FormData){const session=await auth();if(!session?.user.id)throw new Error("UNAUTHENTICATED");const id=z.string().uuid().parse(formData.get("conversationId"));const conversation=await db.aIConversation.findUniqueOrThrow({where:{id}});await requireProfileAccess(session.user.id,conversation.learnerProfileId);await db.aIConversation.update({where:{id},data:{status:"ARCHIVED"}});revalidatePath("/learn/tutor")}
