import { randomUUID } from "node:crypto";
import type { AIModel, AIProvider, AIUsagePurpose } from "@prisma/client";
import { db } from "@/lib/db";
import { decryptSetting, getSettingsEncryptionKey } from "@/lib/settings-crypto";
import { FixedWindowRateLimiter } from "@/lib/rate-limit";
import { createProvider } from "./providers/factory";
import { ProviderHttpError } from "./providers/base";
import type { ChatInput, ChatResponse, StructuredInput } from "./types";
import { canFallback, retryDelayMs, shouldRetrySameModel } from "./retry-policy";

type Candidate = { model: AIModel & { provider: AIProvider } };
const userLimiter = new FixedWindowRateLimiter(30, 60_000);

async function loadCandidates(purpose: AIUsagePurpose, preferredModelId?: string) {
  const route = await db.aIUsageRoute.findUnique({
    where: { purpose },
    include: { models: { where: { enabled: true }, orderBy: { priority: "asc" }, include: { model: { include: { provider: true } } } } }
  });
  const candidates: Candidate[] = route?.enabled ? route.models.filter(({ model }) => model.enabled && model.provider.enabled && !model.provider.deletedAt).map(({ model }) => ({ model })) : [];
  if (!preferredModelId || candidates.some(({ model }) => model.id === preferredModelId)) return preferredModelId
    ? candidates.toSorted((left, right) => Number(right.model.id === preferredModelId) - Number(left.model.id === preferredModelId)) : candidates;
  const preferred = await db.aIModel.findUnique({ where: { id: preferredModelId }, include: { provider: true } });
  return preferred?.enabled && preferred.provider.enabled && !preferred.provider.deletedAt ? [{ model: preferred }, ...candidates] : candidates;
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

async function instantiate(candidate: Candidate) {
  const provider = candidate.model.provider;
  const apiKey = provider.encryptedApiKey && provider.apiKeyIv && provider.apiKeyAuthTag
    ? decryptSetting({ ciphertext: provider.encryptedApiKey, iv: provider.apiKeyIv, authTag: provider.apiKeyAuthTag, keyVersion: provider.keyVersion }, await getSettingsEncryptionKey()) : null;
  return createProvider(provider.type, provider.baseUrl, apiKey, provider.timeoutMs);
}

export async function routedChat(purpose: AIUsagePurpose, input: Omit<ChatInput, "model">, userId?: string, preferredModelId?: string): Promise<ChatResponse> {
  if (userId && !userLimiter.check(`${userId}:${purpose}`).allowed) throw new Error("AI_USER_RATE_LIMIT");
  const candidates = await loadCandidates(purpose, preferredModelId);
  if (!candidates.length) throw new Error(`AI_ROUTE_NOT_CONFIGURED:${purpose}`);
  const requestId = randomUUID(); let fallbackFromId: string | undefined; let attemptNo = 0;
  for (let index = 0; index < candidates.length; index++) {
    const candidate = candidates[index]; let retryCount = 0;
    while (true) {
      const started = Date.now(); attemptNo++;
      try {
        const response = await (await instantiate(candidate)).chat({ ...input, model: candidate.model.name, temperature: input.temperature ?? candidate.model.temperature, maxTokens: input.maxTokens ?? candidate.model.maxTokens });
        await db.aIRequestLog.create({ data: { requestId, providerId: candidate.model.provider.id, modelId: candidate.model.id, purpose, userId, status: "SUCCESS", latencyMs: Date.now() - started, inputTokens: response.inputTokens, outputTokens: response.outputTokens, attemptNo, fallbackFromId } });
        return response;
      } catch (error) {
        const errorType = classifyError(error);
        await db.aIRequestLog.create({ data: { requestId, providerId: candidate.model.provider.id, modelId: candidate.model.id, purpose, userId, status: "FAILED", latencyMs: Date.now() - started, errorType, errorMessage: errorType, attemptNo, fallbackFromId } });
        if (!canFallback(errorType)) throw error;
        if (shouldRetrySameModel(errorType, retryCount)) {
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs(retryCount)));
          retryCount++;
          continue;
        }
        if (index === candidates.length - 1) throw error;
        fallbackFromId = candidate.model.id;
        break;
      }
    }
  }
  throw new Error("AI_ALL_PROVIDERS_FAILED");
}

export async function routedStructured<T>(purpose: AIUsagePurpose, input: Omit<StructuredInput<T>, "model">, userId?: string, preferredModelId?: string) {
  const contract=input.schemaInstructions??input.schemaName;
  const first = await routedChat(purpose, { ...input, messages: [...input.messages, { role: "system", content: `Return one JSON object only. Do not use Markdown or wrap it in another property. Follow this exact contract:\n${contract}` }] }, userId, preferredModelId);
  try { return input.schema.parse(JSON.parse(first.text)); }
  catch (error) {
    await db.auditLog.create({ data: { actorUserId: userId, action: "AI_STRUCTURED_VALIDATION_RETRY", resourceType: "AISchema", resourceId: input.schemaName, metadata: { error: error instanceof Error ? error.name : "VALIDATION_ERROR" } } });
    const issue=error instanceof Error?error.message:"VALIDATION_ERROR";
    const retry = await routedChat(purpose, { ...input, messages: [...input.messages, { role: "system", content: `Your previous JSON failed validation: ${issue.slice(0,2000)}. Return one corrected JSON object only, with the exact keys and enum casing in this contract:\n${contract}` }] }, userId, preferredModelId);
    try { return input.schema.parse(JSON.parse(retry.text)); }
    catch (retryError) { await db.auditLog.create({ data: { actorUserId: userId, action: "AI_STRUCTURED_VALIDATION_FAILED", resourceType: "AISchema", resourceId: input.schemaName, metadata: { error: retryError instanceof Error ? retryError.name : "VALIDATION_ERROR" } } }); throw retryError; }
  }
}
