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

## 中国常用模型

新增 Provider 时可以直接选择后台的“常用 Provider 预设”。系统会自动保存对应的协议类型和 Base URL；随后仍需在该 Provider 下添加厂商控制台显示的真实模型 ID。

```text
DeepSeek:     https://api.deepseek.com/v1
通义千问/百炼: https://dashscope.aliyuncs.com/compatible-mode/v1
智谱 GLM:     https://open.bigmodel.cn/api/paas/v4
月之暗面 Kimi: https://api.moonshot.cn/v1
硅基流动:      https://api.siliconflow.cn/v1
```

这些服务均通过 OpenAI Chat Completions 兼容协议接入。百炼的端点可能因地域、工作空间或套餐而不同，控制台给出的地址优先于预设地址。所谓“免费模型”通常是限时赠送额度、限速模型或新用户试用，并不代表长期无限免费；申请 API Key 时应查看厂商当前价格、额度、数据使用条款和地区限制。若希望请求不离开家庭网络，可使用 Ollama，但 NAS 必须有足够内存和算力。

## Key 安全

- API Key 只提交到服务器，不返回旧值。
- 留空编辑框表示保持原 Key；输入新值表示替换。
- 数据库保存 AES-256-GCM 密文、随机 IV 和认证标签。
- 主密钥只从 `/run/secrets/settings_encryption_key` 读取。
- AI 请求日志不保存 Key、完整 prompt 或完整响应。
- 丢失主密钥后无法解密已有 Provider Key，因此必须独立备份。
