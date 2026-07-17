import { describe, expect, it } from "vitest";
import { modelFormSchema } from "@/modules/ai/schemas";

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
});
