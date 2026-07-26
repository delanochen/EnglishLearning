import { BaseProvider } from "./base";
import type { ChatInput, ChatResponse } from "../types";

export class OpenAICompatibleProvider extends BaseProvider {
  constructor(baseUrl: string, apiKey: string | null, timeoutMs: number, private readonly extraHeaders: Record<string, string> = {}) { super(baseUrl.replace(/\/$/, ""), apiKey, timeoutMs); }
  async chat(input: ChatInput): Promise<ChatResponse> {
    const isDeepSeekReasoner = this.baseUrl.includes("api.deepseek.com") && input.model.toLowerCase().includes("reasoner");
    const payload: Record<string, unknown> = { model: input.model, messages: input.messages };
    if (!isDeepSeekReasoner && input.temperature !== undefined) payload.temperature = input.temperature;
    if (input.maxTokens !== undefined) payload.max_tokens = input.maxTokens;
    const response = await this.request(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}), ...this.extraHeaders },
      body: JSON.stringify(payload),
      signal: input.signal
    });
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number } };
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error("AI_EMPTY_RESPONSE");
    return { text, inputTokens: data.usage?.prompt_tokens, outputTokens: data.usage?.completion_tokens, raw: data };
  }
}

export class OpenAIProvider extends OpenAICompatibleProvider {}
export class OpenRouterProvider extends OpenAICompatibleProvider {}
