import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { OpenAICompatibleProvider } from "@/modules/ai/providers/openai-compatible";

describe("OpenAI compatible provider", () => {
  it("normalizes chat responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: "Hello" } }], usage: { prompt_tokens: 3, completion_tokens: 2 } }), { status: 200 })));
    const provider = new OpenAICompatibleProvider("https://example.test/v1", "key", 1000);
    await expect(provider.chat({ model: "test", messages: [{ role: "user", content: "Hi" }] })).resolves.toMatchObject({ text: "Hello", inputTokens: 3, outputTokens: 2 });
    vi.unstubAllGlobals();
  });

  it("validates structured output", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: "{\"ok\":true}" } }] }), { status: 200 })));
    const provider = new OpenAICompatibleProvider("https://example.test/v1", "key", 1000);
    await expect(provider.generateStructured({ model: "test", messages: [], schemaName: "Result", schema: z.object({ ok: z.boolean() }) })).resolves.toEqual({ ok: true });
    vi.unstubAllGlobals();
  });
});
