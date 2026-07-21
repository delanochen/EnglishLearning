# HomeLingua 内容生产流水线架构

## 范围与原则

本流水线直接集成到现有 HomeLingua，不建立第二套应用或数据库。阶段 1 交付数据模型、状态机、管理员任务 API 和内容中心基础页面；阶段 2 已交付四类结构化 AI 批量生成与数据库队列执行器。Redis/BullMQ Worker、公开资源抓取、质量算法和自动初始化在后续阶段逐步接入。

所有 AI 或外部内容必须遵循：来源/提示输入 → 原始记录 → 清洗与标准化 → 去重 → 规则与 AI 双重难度评估 → 质量与安全检查 → DRAFT/REVIEW_REQUIRED → 审核 → APPROVED → PUBLISHED。任何失败均保留原因和审计记录，不能绕过审核状态直接发布。

## 集成架构

- Next.js 管理端负责创建、查看和控制任务，不在请求线程执行批量工作。
- PostgreSQL 是阶段 1 的任务队列与事实来源；`ContentGenerationJob` 是任务，`ContentGenerationBatch` 是可断点批次，`ContentGenerationItem` 是最小重试单元。
- `modules/content-pipeline/queue.ts` 定义队列端口。阶段 1 使用数据库实现；阶段 3 可换成 BullMQ，API 和业务服务无需改动。
- AI 继续经过现有 `modules/ai/gateway.ts` 路由，结构化输出必须先通过 Zod；失败仅重试一次，无效输出不写入正式内容表。
- 现有 Vocabulary、ReadingArticle、GrammarTopic、ScenarioLesson、ListeningExercise、WritingAssignment 仍是正式内容库。新增的来源、许可证、任务、质量、审核字段采用多态 ID，避免把现有学习进度关系拆散。
- AuditLog 记录管理操作；任务自身的 `logs` 只保存脱敏的结构化事件，不保存 API Key、完整认证头或敏感提示。

## 状态机

统一状态集合为：PENDING、PROCESSING、PAUSED、DRAFT、REVIEW_REQUIRED、APPROVED、PUBLISHED、REJECTED、FAILED、CANCELED、ARCHIVED。

允许的任务转换：

- PENDING → PROCESSING、CANCELED
- PROCESSING → PAUSED、DRAFT、REVIEW_REQUIRED、FAILED、CANCELED
- PAUSED → PROCESSING、CANCELED
- FAILED → PENDING（重试）、ARCHIVED
- DRAFT → REVIEW_REQUIRED、APPROVED、REJECTED、ARCHIVED
- REVIEW_REQUIRED → APPROVED、REJECTED、DRAFT
- APPROVED → PUBLISHED、ARCHIVED
- PUBLISHED → ARCHIVED
- REJECTED → DRAFT、ARCHIVED

状态转换集中在服务层并使用条件更新，防止两个 Worker 或管理员同时修改造成越级状态。

## AI 生成流程

1. 管理员或计划创建 Job，声明类型、等级、主题、数量、模型、Token/预算上限。
2. Worker 按 20–50 条建立 Batch 和 Item，并锁定待处理项。
3. 通过现有 AI gateway 请求结构化 JSON；Zod 校验失败自动重试一次。
4. 保存通过校验的原始输出摘要及哈希，再执行标准化、去重、难度和质量检查。
5. 质量通过的内容写入现有内容表且状态为 DRAFT；规则与 AI 难度差异过大时为 REVIEW_REQUIRED。
6. 审核通过后进入 APPROVED；发布动作单独执行并写审计日志。
7. AIRequestLog 汇总 Token、延迟与失败；Job 汇总本任务 Token 和费用估算。

## 公开资源导入安全规则

- 仅允许 PUBLIC_DOMAIN、CC0、CC_BY、CC_BY_SA、GOVERNMENT_OPEN_DATA、管理员明确批准的 CUSTOM_ALLOWED。
- UNKNOWN 与 RESTRICTED 永不自动发布；许可证缺失等同 UNKNOWN。
- 每条原始内容保存来源 URL、作者、许可证、发布时间、抓取时间、原始哈希和批次。
- 导入器必须先检查管理员批准状态、robots.txt、访问是否需要登录、许可证是否允许修改/商业使用/再分发。
- 禁止默认抓取流媒体、影视字幕、新闻全文、商业教材、付费课程、登录内容或需要绕过限制的资源。
- 抓取器只访问 ImportSource 中批准的域名和路径；禁止任意 URL、内网地址、重定向到未批准域名及文件协议，以降低 SSRF 风险。
- HTML 在保存前转为纯文本并清除脚本、事件属性、广告、追踪参数、密钥和个人敏感信息。
- CC BY/CC BY-SA 发布时必须生成 ContentAttribution；CC BY-SA 的改编内容保留相同方式共享要求。

## 开发阶段

1. 数据结构、数据库队列框架、基础任务 API、内容中心基础页面。
2. 词汇/阅读/语法/场景结构化生成、Zod、批次与重试。
3. Redis、BullMQ、独立 Worker、并发/限速/暂停/恢复/优雅关停。
4. 多级去重、双重难度、质量与安全检查、自动修复、审核工作台。
5. 公开来源配置、许可证判定、清洗、原始内容与署名。
6. 首次启动检测、分批初始化、断点续传和库存补充。
7. 数据库驱动的定时任务、Token/预算限制、统计与告警。

## 阶段 1–2 文件

- `prisma/schema.prisma` 与对应 migration
- `modules/content-pipeline/schemas.ts`
- `modules/content-pipeline/state-machine.ts`
- `modules/content-pipeline/jobs.ts`
- `modules/content-pipeline/queue.ts`
- `app/api/admin/content/jobs/**`
- `app/(protected)/admin/content-center/page.tsx`
- `components/content-job-controls.tsx`
- `tests/unit/content-pipeline-*.test.ts`
- `docs/content-pipeline.md`、`README.md`
- `modules/content-pipeline/generation-schemas.ts`
- `modules/content-pipeline/prompts.ts`
- `modules/content-pipeline/generator.ts`
- `modules/content-pipeline/batching.ts`
- `modules/content-pipeline/processor.ts`
- `modules/content-pipeline/persistence.ts`
- `scripts/run-content-jobs.ts`

## 阶段 2 运行方式

启动生成任务只负责状态转换和建立可恢复的批次，不在 HTTP 请求内调用 AI。数据库队列消费者运行：

```bash
pnpm content:run
```

默认每次最多处理 20 条，可用 `CONTENT_RUN_MAX_ITEMS` 设置 1–200。NAS 在阶段 3 常驻 Worker 上线前，可通过任务计划每 5–10 分钟运行 `docker compose exec -T app /app/scripts/run-content-jobs.sh`。该包装脚本会从 Docker secret 安全构造数据库连接；暂停任务会立即停止领取新条目，已完成条目不会重复生成，失败条目按照任务 `maxRetries` 重试。

## 对现有模块的影响

- 现有学习页面只查询 PUBLISHED 内容，行为保持不变。
- 现有人工新增与 AI 阅读生成继续写 DRAFT；后续逐步接入来源、质量和审核记录。
- AI Provider/Model 继续复用，不复制密钥配置。
- AuditLog、AIRequestLog、备份和 NAS 自动部署继续复用。
- 阶段 3 才向 Docker Compose 增加 Redis 与 content-worker，避免阶段 1 引入尚未使用的常驻服务。
