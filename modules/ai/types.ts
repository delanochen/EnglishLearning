import type { ZodType } from "zod";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
export type ChatInput = { model: string; messages: ChatMessage[]; temperature?: number; maxTokens?: number; signal?: AbortSignal };
export type ChatResponse = { text: string; inputTokens?: number; outputTokens?: number; raw?: unknown };
export type StructuredInput<T> = ChatInput & { schema: ZodType<T>; schemaName: string };
export type ProviderTestResult = { ok: boolean; latencyMs: number; message: string };
export type ProviderHealth = { status: "healthy" | "unavailable"; latencyMs: number; error?: string };

export interface AIProvider {
  chat(input: ChatInput): Promise<ChatResponse>;
  generateStructured<T>(input: StructuredInput<T>): Promise<T>;
  testConnection(model: string): Promise<ProviderTestResult>;
  healthCheck(model: string): Promise<ProviderHealth>;
}
