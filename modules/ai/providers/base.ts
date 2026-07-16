import type { AIProvider, ChatInput, ChatResponse, ProviderHealth, ProviderTestResult, StructuredInput } from "../types";

export abstract class BaseProvider implements AIProvider {
  constructor(protected readonly baseUrl: string, protected readonly apiKey: string | null, protected readonly timeoutMs: number) {}
  abstract chat(input: ChatInput): Promise<ChatResponse>;

  async generateStructured<T>(input: StructuredInput<T>) {
    const response = await this.chat({ ...input, messages: [...input.messages, { role: "system", content: `Return only valid JSON matching schema ${input.schemaName}.` }] });
    let parsed: unknown;
    try { parsed = JSON.parse(response.text); } catch { throw new Error("AI_INVALID_JSON"); }
    return input.schema.parse(parsed);
  }

  async testConnection(model: string): Promise<ProviderTestResult> {
    const started = Date.now();
    try { await this.chat({ model, messages: [{ role: "user", content: "Reply with OK." }], maxTokens: 8 }); return { ok: true, latencyMs: Date.now() - started, message: "连接成功" }; }
    catch (error) { return { ok: false, latencyMs: Date.now() - started, message: sanitizeProviderError(error) }; }
  }

  async healthCheck(model: string): Promise<ProviderHealth> {
    const result = await this.testConnection(model);
    return result.ok ? { status: "healthy", latencyMs: result.latencyMs } : { status: "unavailable", latencyMs: result.latencyMs, error: result.message };
  }

  protected async request(url: string, init: RequestInit) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(url, { ...init, signal: init.signal ?? controller.signal });
      if (!response.ok) throw new ProviderHttpError(response.status, `Provider request failed (${response.status})`);
      return response;
    } finally { clearTimeout(timeout); }
  }
}

export class ProviderHttpError extends Error { constructor(public readonly status: number, message: string) { super(message); } }
export function sanitizeProviderError(error: unknown) {
  if (error instanceof ProviderHttpError) return error.message;
  if (error instanceof Error && error.name === "AbortError") return "请求超时";
  return "Provider 请求失败";
}
