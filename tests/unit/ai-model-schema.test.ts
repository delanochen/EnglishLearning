import { describe, expect, it } from "vitest";
import { modelFormSchema, providerFormSchema, routeModelFormSchema } from "@/modules/ai/schemas";
import { resolveProviderPreset } from "@/modules/ai/provider-presets";

const providerId = "11111111-1111-4111-8111-111111111111";
const modelId = "22222222-2222-4222-8222-222222222222";

describe("AI model form schema", () => {
  it("accepts model creation and supplies default capabilities", () => {
    const result = modelFormSchema.parse({
      providerId,
      name: "gpt-4.1-mini",
      displayName: "GPT 4.1 Mini",
      temperature: "0.4",
      maxTokens: "4096",
      priority: "10"
    });

    expect(result).toMatchObject({
      providerId,
      temperature: 0.4,
      maxTokens: 4096,
      priority: 10,
      capabilities: "chat,structured-output"
    });
  });
  it("validates editable fallback route priority and state",()=>{
    expect(routeModelFormSchema.parse({id:"11111111-1111-4111-8111-111111111111",priority:"20",enabled:"on"})).toMatchObject({priority:20,enabled:"on"});
    expect(()=>routeModelFormSchema.parse({id:"bad",priority:0})).toThrow();
  });

  it("accepts lifecycle fields when editing a model", () => {
    const result = modelFormSchema.parse({
      modelId,
      providerId,
      name: "llama3.2",
      displayName: "Local Llama",
      temperature: "0.2",
      maxTokens: "2048",
      priority: "20",
      capabilities: "chat, translation",
      enabled: "on",
      isDefault: "on"
    });

    expect(result).toMatchObject({ modelId, enabled: "on", isDefault: "on" });
  });

  it("rejects unsafe model parameters", () => {
    expect(() => modelFormSchema.parse({
      providerId,
      name: "bad-model",
      displayName: "Bad Model",
      temperature: "3",
      maxTokens: "0",
      priority: "0"
    })).toThrow();
  });

  it("maps Chinese provider presets to OpenAI-compatible endpoints", () => {
    expect(resolveProviderPreset("DEEPSEEK", "OPENAI", "https://wrong.test")).toEqual({ type: "OPENAI_COMPATIBLE", baseUrl: "https://api.deepseek.com/v1" });
    expect(resolveProviderPreset("QWEN", "OPENAI", "https://wrong.test")).toEqual({ type: "OPENAI_COMPATIBLE", baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1" });
    const input = providerFormSchema.parse({ name: "Family DeepSeek", preset: "DEEPSEEK", type: "OPENAI", baseUrl: "https://api.openai.com/v1", apiKey: "secret", timeoutMs: "30000", priority: "100" });
    expect(input.preset).toBe("DEEPSEEK");
  });
});
