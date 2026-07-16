import { BaseProvider } from "./base";
import type { ChatInput, ChatResponse } from "../types";

export class GeminiProvider extends BaseProvider {
  async chat(input: ChatInput): Promise<ChatResponse> {
    if (!this.apiKey) throw new Error("API_KEY_REQUIRED");
    const contents = input.messages.filter((message) => message.role !== "system").map((message) => ({ role: message.role === "assistant" ? "model" : "user", parts: [{ text: message.content }] }));
    const systemInstruction = input.messages.find((message) => message.role === "system");
    const response = await this.request(`${this.baseUrl.replace(/\/$/, "")}/models/${encodeURIComponent(input.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`, {
      method: "POST", headers: { "content-type": "application/json" }, signal: input.signal,
      body: JSON.stringify({ contents, ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction.content }] } } : {}), generationConfig: { temperature: input.temperature, maxOutputTokens: input.maxTokens } })
    });
    const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number } };
    const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("");
    if (!text) throw new Error("AI_EMPTY_RESPONSE");
    return { text, inputTokens: data.usageMetadata?.promptTokenCount, outputTokens: data.usageMetadata?.candidatesTokenCount, raw: data };
  }
}
