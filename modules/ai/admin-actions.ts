"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { decryptSetting, encryptSetting, getSettingsEncryptionKey } from "@/lib/settings-crypto";
import { requireSystemAdmin } from "@/modules/authorization/require-admin";
import { createProvider } from "./providers/factory";
import { resolveProviderPreset } from "./provider-presets";
import { idSchema, modelFormSchema, providerFormSchema, routeFormSchema, routeModelFormSchema } from "./schemas";

export async function saveProvider(formData: FormData) {
  const user = await requireSystemAdmin();
  const input = providerFormSchema.parse(Object.fromEntries(formData));
  const resolved = resolveProviderPreset(input.preset, input.type, input.baseUrl);
  if (resolved.type !== "OLLAMA" && !input.providerId && !input.apiKey) throw new Error("API_KEY_REQUIRED");
  const encrypted = input.apiKey ? encryptSetting(input.apiKey, await getSettingsEncryptionKey()) : null;
  const data = {
    name: input.name, type: resolved.type, baseUrl: resolved.baseUrl.replace(/\/$/, ""), timeoutMs: input.timeoutMs, priority: input.priority, notes: input.notes || null,
    ...(encrypted ? { encryptedApiKey: encrypted.ciphertext, apiKeyIv: encrypted.iv, apiKeyAuthTag: encrypted.authTag, keyVersion: encrypted.keyVersion } : {})
  };
  const provider = input.providerId
    ? await db.aIProvider.update({ where: { id: input.providerId }, data })
    : await db.aIProvider.create({ data });
  await db.auditLog.create({ data: { actorUserId: user.id, action: input.providerId ? "ai-provider.update" : "ai-provider.create", resourceType: "AIProvider", resourceId: provider.id, metadata: { name: provider.name, type: provider.type } } });
  revalidatePath("/admin/ai");
}

export async function saveModel(formData: FormData) {
  const user = await requireSystemAdmin();
  const input = modelFormSchema.parse(Object.fromEntries(formData));
  const data = { providerId: input.providerId, name: input.name, displayName: input.displayName, temperature: input.temperature, maxTokens: input.maxTokens, priority: input.priority, capabilities: input.capabilities.split(",").map((item) => item.trim()).filter(Boolean), enabled: input.modelId ? input.enabled === "on" : true, isDefault: input.isDefault === "on" };
  const model = await db.$transaction(async (tx) => { if (data.isDefault) await tx.aIModel.updateMany({ where: { providerId: input.providerId, ...(input.modelId ? { id: { not: input.modelId } } : {}) }, data: { isDefault: false } }); return input.modelId ? tx.aIModel.update({ where: { id: input.modelId }, data }) : tx.aIModel.create({ data }); });
  await db.auditLog.create({ data: { actorUserId: user.id, action: input.modelId ? "ai-model.update" : "ai-model.create", resourceType: "AIModel", resourceId: model.id, metadata: { name: model.name, providerId: model.providerId, enabled: model.enabled, isDefault: model.isDefault } } });
  revalidatePath("/admin/ai");
}

export const addModel = saveModel;

export async function removeModel(formData:FormData){const user=await requireSystemAdmin();const{id}=idSchema.parse(Object.fromEntries(formData));const model=await db.aIModel.findUniqueOrThrow({where:{id},include:{_count:{select:{requestLogs:true}}}});await db.$transaction(async tx=>{await tx.aIUsageRouteModel.deleteMany({where:{modelId:id}});if(model._count.requestLogs)await tx.aIModel.update({where:{id},data:{enabled:false,isDefault:false,status:"UNKNOWN",lastError:"ARCHIVED"}});else await tx.aIModel.delete({where:{id}});await tx.auditLog.create({data:{actorUserId:user.id,action:model._count.requestLogs?"ai-model.archive":"ai-model.delete",resourceType:"AIModel",resourceId:id}})});revalidatePath("/admin/ai")}

export async function removeRouteModel(formData:FormData){const user=await requireSystemAdmin();const{id}=idSchema.parse(Object.fromEntries(formData));const row=await db.aIUsageRouteModel.findUniqueOrThrow({where:{id}});await db.$transaction([db.aIUsageRouteModel.delete({where:{id}}),db.auditLog.create({data:{actorUserId:user.id,action:"ai-route-model.remove",resourceType:"AIUsageRoute",resourceId:row.routeId,metadata:{modelId:row.modelId}}})]);revalidatePath("/admin/ai")}

export async function updateRouteModel(formData:FormData){const user=await requireSystemAdmin();const input=routeModelFormSchema.parse(Object.fromEntries(formData));const row=await db.aIUsageRouteModel.update({where:{id:input.id},data:{priority:input.priority,enabled:input.enabled==="on"}});await db.auditLog.create({data:{actorUserId:user.id,action:"ai-route-model.update",resourceType:"AIUsageRoute",resourceId:row.routeId,metadata:{modelId:row.modelId,priority:row.priority,enabled:row.enabled}}});revalidatePath("/admin/ai")}

export async function toggleRoute(formData:FormData){const user=await requireSystemAdmin();const{id}=idSchema.parse(Object.fromEntries(formData));const route=await db.aIUsageRoute.findUniqueOrThrow({where:{id}});await db.aIUsageRoute.update({where:{id},data:{enabled:!route.enabled}});await db.auditLog.create({data:{actorUserId:user.id,action:route.enabled?"ai-route.disable":"ai-route.enable",resourceType:"AIUsageRoute",resourceId:id}});revalidatePath("/admin/ai")}

export async function toggleProvider(formData: FormData) {
  const user = await requireSystemAdmin(); const { id } = idSchema.parse(Object.fromEntries(formData));
  const current = await db.aIProvider.findUniqueOrThrow({ where: { id } });
  await db.aIProvider.update({ where: { id }, data: { enabled: !current.enabled } });
  await db.auditLog.create({ data: { actorUserId: user.id, action: current.enabled ? "ai-provider.disable" : "ai-provider.enable", resourceType: "AIProvider", resourceId: id } });
  revalidatePath("/admin/ai");
}

export async function deleteProvider(formData: FormData) {
  const user = await requireSystemAdmin(); const { id } = idSchema.parse(Object.fromEntries(formData));
  await db.aIProvider.update({ where: { id }, data: { enabled: false, deletedAt: new Date() } });
  await db.auditLog.create({ data: { actorUserId: user.id, action: "ai-provider.delete", resourceType: "AIProvider", resourceId: id } });
  revalidatePath("/admin/ai");
}

export async function testProvider(formData: FormData) {
  await requireSystemAdmin(); const { id } = idSchema.parse(Object.fromEntries(formData));
  const provider = await db.aIProvider.findUniqueOrThrow({ where: { id }, include: { models: { where: { enabled: true }, orderBy: { priority: "asc" }, take: 1 } } });
  const model = provider.models[0];
  if (!model) {
    await db.aIProvider.update({ where: { id }, data: { lastConnectionAt: new Date(), lastConnectionOk: false, lastConnectionError: "MODEL_REQUIRED" } });
    revalidatePath("/admin/ai");
    return;
  }
  const apiKey = provider.encryptedApiKey && provider.apiKeyIv && provider.apiKeyAuthTag
    ? decryptSetting({ ciphertext: provider.encryptedApiKey, iv: provider.apiKeyIv, authTag: provider.apiKeyAuthTag, keyVersion: provider.keyVersion }, await getSettingsEncryptionKey()) : null;
  const result = await createProvider(provider.type, provider.baseUrl, apiKey, provider.timeoutMs).testConnection(model.name);
  await db.$transaction([
    db.aIProvider.update({ where: { id }, data: { lastConnectionAt: new Date(), lastConnectionOk: result.ok, lastConnectionMs: result.latencyMs, lastConnectionError: result.ok ? null : result.message } }),
    db.aIModel.update({ where: { id: model.id }, data: { status: result.ok ? "HEALTHY" : "UNAVAILABLE", lastCheckedAt: new Date(), lastLatencyMs: result.latencyMs, lastError: result.ok ? null : result.message } })
  ]);
  revalidatePath("/admin/ai");
}

export async function testProviderGeneration(formData:FormData){const user=await requireSystemAdmin();const{id}=idSchema.parse(Object.fromEntries(formData));const provider=await db.aIProvider.findUniqueOrThrow({where:{id},include:{models:{where:{enabled:true},orderBy:{priority:"asc"},take:1}}});const model=provider.models[0];if(!model){await db.aIProvider.update({where:{id},data:{lastConnectionAt:new Date(),lastConnectionOk:false,lastConnectionError:"MODEL_REQUIRED",lastTestOutput:null}});revalidatePath("/admin/ai");return}const apiKey=provider.encryptedApiKey&&provider.apiKeyIv&&provider.apiKeyAuthTag?decryptSetting({ciphertext:provider.encryptedApiKey,iv:provider.apiKeyIv,authTag:provider.apiKeyAuthTag,keyVersion:provider.keyVersion},await getSettingsEncryptionKey()):null;const started=Date.now();try{const response=await createProvider(provider.type,provider.baseUrl,apiKey,provider.timeoutMs).chat({model:model.name,messages:[{role:"user",content:"Reply with one short friendly English sentence for an A2 learner."}],temperature:.2,maxTokens:80});await db.$transaction([db.aIProvider.update({where:{id},data:{lastConnectionAt:new Date(),lastConnectionOk:true,lastConnectionMs:Date.now()-started,lastConnectionError:null,lastTestOutput:response.text.slice(0,500)}}),db.auditLog.create({data:{actorUserId:user.id,action:"AI_TEST_GENERATION_SUCCESS",resourceType:"AIProvider",resourceId:id}})])}catch(error){const message=error instanceof Error?error.name:"GENERATION_FAILED";await db.aIProvider.update({where:{id},data:{lastConnectionAt:new Date(),lastConnectionOk:false,lastConnectionMs:Date.now()-started,lastConnectionError:message,lastTestOutput:null}})}revalidatePath("/admin/ai")}

export async function saveRoute(formData: FormData) {
  const user = await requireSystemAdmin(); const input = routeFormSchema.parse(Object.fromEntries(formData));
  const route = await db.aIUsageRoute.upsert({ where: { purpose: input.purpose }, update: { enabled: true }, create: { purpose: input.purpose } });
  await db.aIUsageRouteModel.upsert({ where: { routeId_modelId: { routeId: route.id, modelId: input.modelId } }, update: { priority: input.priority, enabled: true }, create: { routeId: route.id, modelId: input.modelId, priority: input.priority } });
  await db.auditLog.create({ data: { actorUserId: user.id, action: "ai-route.update", resourceType: "AIUsageRoute", resourceId: route.id, metadata: input } });
  revalidatePath("/admin/ai");
}
