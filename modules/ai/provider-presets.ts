import type { AIProviderType } from "@prisma/client";

export const providerPresetIds = ["CUSTOM", "OPENAI", "OPENROUTER", "GEMINI", "DEEPSEEK", "QWEN", "ZHIPU_GLM", "MOONSHOT_KIMI", "SILICONFLOW", "OLLAMA"] as const;
export type ProviderPresetId = (typeof providerPresetIds)[number];

export const providerPresets: Array<{
  id: ProviderPresetId;
  label: string;
  type: AIProviderType;
  baseUrl: string;
  models: string[];
}> = [
  { id: "OPENAI", label: "OpenAI", type: "OPENAI", baseUrl: "https://api.openai.com/v1", models: ["gpt-4.1-mini", "gpt-4.1"] },
  { id: "OPENROUTER", label: "OpenRouter", type: "OPENROUTER", baseUrl: "https://openrouter.ai/api/v1", models: ["openai/gpt-4.1-mini", "google/gemini-2.5-flash"] },
  { id: "GEMINI", label: "Google Gemini", type: "GEMINI", baseUrl: "https://generativelanguage.googleapis.com/v1beta", models: ["gemini-2.5-flash", "gemini-2.5-pro"] },
  { id: "DEEPSEEK", label: "DeepSeek（深度求索）", type: "OPENAI_COMPATIBLE", baseUrl: "https://api.deepseek.com/v1", models: ["deepseek-chat", "deepseek-reasoner"] },
  { id: "QWEN", label: "阿里云百炼 / 通义千问", type: "OPENAI_COMPATIBLE", baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", models: ["qwen-plus", "qwen-flash"] },
  { id: "ZHIPU_GLM", label: "智谱 GLM", type: "OPENAI_COMPATIBLE", baseUrl: "https://open.bigmodel.cn/api/paas/v4", models: ["glm-4-flash", "glm-4-plus"] },
  { id: "MOONSHOT_KIMI", label: "月之暗面 Kimi", type: "OPENAI_COMPATIBLE", baseUrl: "https://api.moonshot.cn/v1", models: ["moonshot-v1-8k", "kimi-k2-0711-preview"] },
  { id: "SILICONFLOW", label: "硅基流动 SiliconFlow", type: "OPENAI_COMPATIBLE", baseUrl: "https://api.siliconflow.cn/v1", models: ["deepseek-ai/DeepSeek-V3", "Qwen/Qwen3-8B"] },
  { id: "OLLAMA", label: "Ollama（NAS 本地模型）", type: "OLLAMA", baseUrl: "http://ollama:11434", models: ["qwen3:8b", "llama3.2:3b"] },
];

export function resolveProviderPreset(id: ProviderPresetId, fallbackType: AIProviderType, fallbackBaseUrl: string) {
  if (id === "CUSTOM") return { type: fallbackType, baseUrl: fallbackBaseUrl };
  const preset = providerPresets.find((item) => item.id === id);
  if (!preset) return { type: fallbackType, baseUrl: fallbackBaseUrl };
  return { type: preset.type, baseUrl: preset.baseUrl };
}
