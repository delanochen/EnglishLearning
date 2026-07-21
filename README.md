# HomeLingua · AI 家庭英语学习平台

HomeLingua 是面向家庭 NAS 的自托管英语学习平台，覆盖家庭成员管理、十类学习模块、多 Provider AI、自动学习计划与报告，以及可恢复的 NAS 运维链路。

网页右下角显示当前部署版本。版本升级规则见 [版本策略](docs/versioning.md)。

## 已实现

- Next.js 15 App Router、TypeScript strict、Tailwind CSS、shadcn/ui 配置
- Auth.js 凭据登录、Argon2id 密码、登录失败限流
- SystemAdmin / FamilyOwner / Parent / Learner / Child 权限基础
- 家庭级后端数据隔离、成员及学习档案创建、审计日志
- PostgreSQL + Prisma 初始迁移与幂等 seed
- Docker Compose、Docker secrets、持久化目录、健康检查与日志轮转
- 中英文导航切换、家庭友好响应式布局、深色模式和大字体模式
- Vitest 权限单元测试和 Playwright 基础配置
- Gemini、OpenAI、OpenRouter、OpenAI Compatible 与 Ollama Provider 适配器
- AES-256-GCM API Key 加密、遮盖显示、连接测试、真实生成测试和模型状态
- 按用途配置多个模型、优先级故障切换、Token/延迟/错误日志
- 结构化 AI 输出校验与一次自动修复重试
- AI 英语老师：分级提示词、六种教师风格、历史对话与重点消息收藏
- 首次/重复水平测试：词汇、理解、听力、阅读、语法、写作和可选口语，保留历史并自动生成首周计划
- 词汇学习：例句与中文释义、八类练习、词汇关系、SM-2 风格间隔复习和熟练度记录
- 分级阅读：文章、中文辅助、理解题、成绩与学习活动记录
- 每日任务：八类任务轮换、薄弱项优先、访问时自动补齐、定时批量生成、完成状态和 XP 奖励
- 连续学习、补签额度、暂停计划、假期模式、周末轻量模式和温和型个人成就
- 语法训练：规则与例句、练习记录、薄弱项和复习时间
- 听力训练：浏览器英语朗读、速度控制、原文辅助和理解题
- 口语训练：Web Speech API 能力检测、识别文本、准确度与流利度历史
- MediaRecorder 私有录音、鉴权下载、SHA-256 文件记录，以及语法/完整度/自然度/语速/停顿/发音细项
- 写作训练：多版本提交、语法/拼写/词汇/结构/自然度五维评分、逐条问题标注、参考改写和无 AI 路由时的安全降级
- 家庭学习仪表盘：今日/7 天时长、相较前 7 天进步、任务完成率、异常提醒与可选排行榜
- 学习计划：个性化周计划、人工覆盖、调整原因、版本历史和回滚
- 自动周报/月报：完成率、时长、平均成绩、优势、薄弱项和学习建议
- 美国生活场景课：分类课程、双语字幕、逐句/连续朗读、角色跟读
- 场景文化提示、常见误解、自然表达、图文时间线和课程测验
- 场景内容来源与原创/AI 生成标记、个人进度和 XP 奖励
- PWA 安装入口、离线提示壳和不缓存私有学习数据的 Service Worker
- 数据库/uploads 联合备份、SHA-256 校验、恢复保护和保留策略
- 管理员运维页、数据库/磁盘状态、AI 失败统计和最近备份
- CSP 与安全响应头、认证 API 限流、上传白名单校验，以及真实 PostgreSQL + Chromium 的登录/成员选择 E2E

后续高级模块路线参见 [架构计划](docs/architecture-plan.md)。

## 内容生产流水线（阶段 1–4）

管理员可从 `/admin/content-center` 创建和控制内容生产任务。阶段 1 已提供 PostgreSQL 任务/批次/条目模型、来源与许可证、导入原文、审核、质量、重复项、计划、使用统计、标签/主题/署名实体，以及受系统管理员权限保护的任务 API。阶段 2 已接入词汇、阅读、语法和生活场景的结构化 AI 生成，按 20–50 条分批、逐条断点续传、失败重试，并只把通过 Zod 校验的内容写入现有内容表的 `DRAFT` 状态。

所有 AI 或公开资源内容必须先进入草稿/审核流程，不能直接发布。`UNKNOWN` 与 `RESTRICTED` 许可证默认禁止发布。完整架构、状态机、公开资源安全边界和后续阶段见 [内容生产流水线架构](docs/content-pipeline.md)。

任务 API：

- `GET/POST /api/admin/content/jobs`
- `GET /api/admin/content/jobs/:id`
- `POST /api/admin/content/jobs/:id/start|pause|resume|cancel|retry`

阶段 3 已加入 Redis、BullMQ 和独立 `content-worker`。启动、恢复或重试任务会自动入队；Worker 支持可配置并发、全局速率限制、优先级、自动重试、暂停/恢复、取消跳过、重启恢复和优雅关停。PostgreSQL 仍是任务与进度的事实来源，Redis 数据使用 AOF 持久化。

阶段 4 已加入规则与 AI 双重质量评估、Flesch/Flesch-Kincaid 阅读指标、CEFR 差异检查、敏感内容与密钥检测、题目唯一答案检查、标准化哈希及 n-gram 去重、一次自动修复，以及 `/admin/content-review` 人工审核工作台。质量失败内容进入 `REVIEW_REQUIRED`，批准后只进入 `APPROVED`，不会绕过单独发布步骤。

## 快速启动（Docker）

要求：Docker Engine 24+ 与 Docker Compose v2。

1. 复制环境变量示例：

   ```bash
   cp .env.example .env
   ```

2. 为下列文件创建真实值（不要保留 `.example` 后缀）：

   ```text
   secrets/postgres_password
   secrets/auth_secret
   secrets/settings_encryption_key
   secrets/initial_admin_email
   secrets/initial_admin_password
   ```

   `auth_secret` 至少 32 个随机字符；管理员密码至少 12 个字符。`settings_encryption_key` 在阶段 2 使用，建议现在即生成并离线备份。群晖部署还需执行 `chmod 700 secrets && chmod 644 secrets/*`，让 app 容器中的非 root 用户能够读取挂载的文件型 secrets。

3. 构建并启动：

   ```bash
   docker compose up -d --build
   docker compose ps
   ```

   新版本拉取后，容器入口会自动执行数据库迁移和幂等 seed；也可手动执行 `docker compose exec app ./node_modules/.bin/tsx prisma/seed.ts` 刷新学习内容。

4. 打开 `http://NAS-IP:3000`，使用 secret 文件中的初始管理员账号登录。

5. 按需启动 Adminer：

   ```bash
   docker compose --profile tools up -d adminer
   ```

   Adminer 默认只绑定宿主机 `127.0.0.1:8080`，不要直接暴露到公网。

## 开发与验证

本地开发需要 Node.js 20+、pnpm 和 PostgreSQL：

```bash
pnpm install
pnpm prisma generate
pnpm prisma migrate deploy
pnpm prisma db seed
pnpm tsx scripts/init-admin.ts
pnpm dev
```

本地模式可用 `DATABASE_URL`、`AUTH_SECRET`、`INITIAL_ADMIN_EMAIL`、`INITIAL_ADMIN_PASSWORD` 提供必要底层配置；生产环境使用 Docker secrets。

质量检查：

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## 健康检查

- `GET /api/health/live`：Next.js 进程存活。
- `GET /api/health/ready`：数据库可访问且 uploads/logs 挂载可写。

## 目录

- `app/`：页面、Auth.js API、健康检查
- `components/`：应用壳和交互组件
- `modules/`：身份、授权、家庭等领域模块
- `modules/content-pipeline/`：内容任务、状态机、许可证策略和队列端口
- `lib/`：数据库、密码、secret 等基础设施
- `prisma/`：Schema、迁移、seed
- `scripts/`：容器入口和管理员初始化
- `docs/`：架构、部署、安全与群晖说明
- `uploads/`、`logs/`、`backups/`、`secrets/`：NAS 持久目录

## 安全提示

- 不要提交 `.env` 或真实 secret 文件。
- 不要把 Adminer 或 PostgreSQL 端口映射到公网。
- 建议通过可信反向代理提供 HTTPS；生产 Cookie 在 HTTPS 环境下使用安全属性。
- 初始管理员已经存在时，启动脚本不会覆盖其密码。
- 家庭权限在每个服务端写操作中重新校验，不依赖前端隐藏按钮。

详见 [安全说明](docs/security.md) 与 [Docker/群晖部署说明](docs/deployment.md)。
升级前请阅读 [群晖升级与回滚](docs/upgrade-rollback.md)，定期按照 [备份与恢复](docs/backup-restore.md) 做恢复演练。

第一次安装请按 [第一次启动与管理员初始化](docs/first-start.md) 操作；部署或运行异常可查阅 [常见问题](docs/faq.md)。AI 模型配置详见 [AI Provider 配置](docs/ai-provider.md)。
