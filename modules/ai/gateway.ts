import { randomUUID } from "node:crypto";
import type { AIUsagePurpose } from "@prisma/client";
import { db } from "@/lib/db";
import { decryptSetting, getSettingsEncryptionKey } from "@/lib/settings-crypto";
import { FixedWindowRateLimiter } from "@/lib/rate-limit";
import { createProvider } from "./providers/factory";
import { ProviderHttpError } from "./providers/base";
import type { ChatInput, ChatResponse, StructuredInput } from "./types";

type Candidate = Awaited<ReturnType<typeof loadCandidates>>[number];
const userLimiter = new FixedWindowRateLimiter(30, 60_000);

async function loadCandidates(purpose: AIUsagePurpose) {
  const route = await db.aIUsageRoute.findUnique({
    where: { purpose },
    include: { models: { where: { enabled: true }, orderBy: { priority: "asc" }, include: { model: { include: { provider: true } } } } }
  });
  if (!route?.enabled) return [];
  return route.models.filter(({ model }) => model.enabled && model.provider.enabled && !model.provider.deletedAt);
}

function classifyError(error: unknown) {
  if (error instanceof ProviderHttpError) {
    if (error.status === 429) return "RATE_LIMIT";
    if (error.status === 401 || error.status === 403) return "AUTH";
    if (error.status >= 500) return "PROVIDER_5XX";
    return "PROVIDER_4XX";
  }
  if (error instanceof Error && error.name === "AbortError") return "TIMEOUT";
  if (error instanceof Error && ["AI_INVALID_JSON", "AI_EMPTY_RESPONSE"].includes(error.message)) return error.message;
  return "UNKNOWN";
}

function canFallback(errorType: string) { return ["RATE_LIMIT", "PROVIDER_5XX", "TIMEOUT", "UNKNOWN", "AI_EMPTY_RESPONSE", "AI_INVALID_JSON"].includes(errorType); }

async function instantiate(candidate: Candidate) {
  const provider = candidate.model.provider;
  const apiKey = provider.encryptedApiKey && provider.apiKeyIv && provider.apiKeyAuthTag
    ? decryptSetting({ ciphertext: provider.encryptedApiKey, iv: provider.apiKeyIv, authTag: provider.apiKeyAuthTag, keyVersion: provider.keyVersion }, await getSettingsEncryptionKey()) : null;
  return createProvider(provider.type, provider.baseUrl, apiKey, provider.timeoutMs);
}

export async function routedChat(purpose: AIUsagePurpose, input: Omit<ChatInput, "model">, userId?: string): Promise<ChatResponse> {
  if (userId && !userLimiter.check(`${userId}:${purpose}`).allowed) throw new Error("AI_USER_RATE_LIMIT");
  const candidates = await loadCandidates(purpose);
  if (!candidates.length) throw new Error(`AI_ROUTE_NOT_CONFIGURED:${purpose}`);
  const requestId = randomUUID(); let fallbackFromId: string | undefined;
  for (let index = 0; index < candidates.length; index++) {
    const candidate = candidates[index]; const started = Date.now();
    try {
      const response = await (await instantiate(candidate)).chat({ ...input, model: candidate.model.name, temperature: input.temperature ?? candidate.model.temperature, maxTokens: input.maxTokens ?? candidate.model.maxTokens });
      await db.aIRequestLog.create({ data: { requestId, providerId: candidate.model.provider.id, modelId: candidate.model.id, purpose, userId, status: "SUCCESS", latencyMs: Date.now() - started, inputTokens: response.inputTokens, outputTokens: response.outputTokens, attemptNo: index + 1, fallbackFromId } });
      return response;
    } catch (error) {
      const errorType = classifyError(error);
      await db.aIRequestLog.create({ data: { requestId, providerId: candidate.model.provider.id, modelId: candidate.model.id, purpose, userId, status: "FAILED", latencyMs: Date.now() - started, errorType, errorMessage: errorType, attemptNo: index + 1, fallbackFromId } });
      if (!canFallback(errorType) || index === candidates.length - 1) throw error;
      fallbackFromId = candidate.model.id;
    }
  }
  throw new Error("AI_ALL_PROVIDERS_FAILED");
}

export async function routedStructured<T>(purpose: AIUsagePurpose, input: Omit<StructuredInput<T>, "model">, userId?: string) {
  const first = await routedChat(purpose, { ...input, messages: [...input.messages, { role: "system", content: `Return only JSON for schema ${input.schemaName}.` }] }, userId);
  try { return input.schema.parse(JSON.parse(first.text)); }
  catch (error) {
    await db.auditLog.create({ data: { actorUserId: userId, action: "AI_STRUCTURED_VALIDATION_RETRY", resourceType: "AISchema", resourceId: input.schemaName, metadata: { error: error instanceof Error ? error.name : "VALIDATION_ERROR" } } });
    const retry = await routedChat(purpose, { ...input, messages: [...input.messages, { role: "system", content: `Your previous response was invalid. Return only valid JSON matching ${input.schemaName}.` }] }, userId);
    try { return input.schema.parse(JSON.parse(retry.text)); }
    catch (retryError) { await db.auditLog.create({ data: { actorUserId: userId, action: "AI_STRUCTURED_VALIDATION_FAILED", resourceType: "AISchema", resourceId: input.schemaName, metadata: { error: retryError instanceof Error ? retryError.name : "VALIDATION_ERROR" } } }); throw retryError; }
  }
}
