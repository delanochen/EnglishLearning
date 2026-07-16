import { BaseProvider } from "./base";
import type { ChatInput, ChatResponse } from "../types";

export class OllamaProvider extends BaseProvider {
  async chat(input: ChatInput): Promise<ChatResponse> {
    const response = await this.request(`${this.baseUrl.replace(/\/$/, "")}/api/chat`, {
      method: "POST", headers: { "content-type": "application/json" }, signal: input.signal,
      body: JSON.stringify({ model: input.model, messages: input.messages, stream: false, options: { temperature: input.temperature, num_predict: input.maxTokens } })
    });
    const data = await response.json() as { message?: { content?: string }; prompt_eval_count?: number; eval_count?: number };
    if (!data.message?.content) throw new Error("AI_EMPTY_RESPONSE");
    return { text: data.message.content, inputTokens: data.prompt_eval_count, outputTokens: data.eval_count, raw: data };
  }
}
