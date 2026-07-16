import type { AIProviderType } from "@prisma/client";
import type { AIProvider } from "../types";
import { GeminiProvider } from "./gemini";
import { OllamaProvider } from "./ollama";
import { OpenAICompatibleProvider, OpenAIProvider, OpenRouterProvider } from "./openai-compatible";

export function createProvider(type: AIProviderType, baseUrl: string, apiKey: string | null, timeoutMs: number): AIProvider {
  switch (type) {
    case "GEMINI": return new GeminiProvider(baseUrl, apiKey, timeoutMs);
    case "OLLAMA": return new OllamaProvider(baseUrl, null, timeoutMs);
    case "OPENAI": return new OpenAIProvider(baseUrl, apiKey, timeoutMs);
    case "OPENROUTER": return new OpenRouterProvider(baseUrl, apiKey, timeoutMs, { "HTTP-Referer": "HomeLingua", "X-Title": "HomeLingua" });
    case "OPENAI_COMPATIBLE": return new OpenAICompatibleProvider(baseUrl, apiKey, timeoutMs);
  }
}
