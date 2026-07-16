# 安全说明

## 已落实

- 密码使用 Argon2id；Auth.js secret 来自 Docker secret。
- 登录失败按邮箱哈希与 IP 哈希限流，认证 API 另有固定窗口限流和 `Retry-After`。
- 所有敏感写操作重新验证 Session、RBAC、familyId 或 learnerProfileId 归属。
- AI API Key 使用 AES-256-GCM 加密，只在服务端通过独立主密钥解密；日志不保存 Key 或完整 prompt。
- 全局设置 CSP、frame deny、nosniff、严格 referrer、浏览器能力和 opener policy。
- Server Action 请求体限制为 2 MB；上传工具提供 MIME、扩展名、大小、魔数白名单和随机存储名。
- Service Worker 只缓存离线壳、图标和构建静态资源，不缓存受保护页面或 API。
- Docker 使用非 root app 用户、内部数据库网络、日志大小轮转和文件型 secrets。
- PostgreSQL 与 uploads 联合备份提供 SHA-256 清单；恢复必须显式确认并先解压到 staging。

## 部署边界

HomeLingua 默认面向家庭局域网。若需要外网访问，必须通过 HTTPS 反向代理或可信 VPN；不要暴露 PostgreSQL 或 Adminer。反向代理应覆盖 HSTS、证书续期、请求体上限和可信来源 IP 设置。

当前 CSP 为兼容 Next.js 内联启动脚本保留 `'unsafe-inline'`。后续升级框架时可评估 nonce；这不影响 `frame-ancestors 'none'`、`object-src 'none'` 和同源 connect 等限制。

内存 API 限流适用于默认单 app 容器；若扩展为多实例，需要改用 Redis 或共享数据库限流。浏览器 Web Speech API 的音频处理行为由浏览器供应商决定，敏感语音场景应关闭该能力或使用受控的本地识别服务。

依赖升级前运行 `pnpm audit`，并在测试环境完成 lint、typecheck、unit、E2E、build 和数据库恢复演练。
