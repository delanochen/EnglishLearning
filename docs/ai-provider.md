# AI Provider 配置说明

系统管理员登录后进入“管理后台 → AI 模型管理”。配置修改直接保存在 PostgreSQL，后续请求即时读取，无需重启容器。

## 配置顺序

1. 添加 Provider，填写类型、Base URL、API Key、超时和优先级。
2. 在 Provider 下添加至少一个模型，模型名称必须使用厂商 API 接受的真实 ID。
3. 点击“测试连接”，确认状态和延迟。
4. 在“AI 用途路由”中为每个用途添加模型；优先级数字越小越先使用。
5. 可为同一用途添加多个模型。429、超时、5xx 或临时错误会按优先级切换。

## 常用 Base URL

```text
OpenAI:      https://api.openai.com/v1
OpenRouter:  https://openrouter.ai/api/v1
Gemini:      https://generativelanguage.googleapis.com/v1beta
Ollama:      http://ollama:11434
```

OpenAI Compatible API 应填写包含版本前缀、且其后可以追加 `/chat/completions` 的地址。

## Key 安全

- API Key 只提交到服务器，不返回旧值。
- 留空编辑框表示保持原 Key；输入新值表示替换。
- 数据库保存 AES-256-GCM 密文、随机 IV 和认证标签。
- 主密钥只从 `/run/secrets/settings_encryption_key` 读取。
- AI 请求日志不保存 Key、完整 prompt 或完整响应。
- 丢失主密钥后无法解密已有 Provider Key，因此必须独立备份。
