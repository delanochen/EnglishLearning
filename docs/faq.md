# 常见问题

## 浏览器显示 `ERR_CONNECTION_REFUSED`

先在 NAS 项目目录执行：

```bash
docker compose ps -a
docker compose logs --tail=300 app postgres
curl -v http://127.0.0.1:3000/api/health/live
```

如果 app 不在运行，优先处理日志中的第一条错误。不要把 Docker 输出中的 `✔`、`[+] Running` 等状态行当作命令再次输入。

## `no configuration file provided`

当前目录不对。执行：

```bash
cd /volume2/docker/EnglishLearning
docker compose ps
```

## `not a git repository`

同样是目录错误，或 NAS 目录并非 Git clone。确认：

```bash
cd /volume2/docker/EnglishLearning
ls -la .git docker-compose.yml
```

## `detected dubious ownership`

```bash
git config --global --add safe.directory /volume2/docker/EnglishLearning
```

## Secret 文件不存在或 `Permission denied`

确认五个 secret 均为非空普通文件：

```bash
cd /volume2/docker/EnglishLearning
find secrets -maxdepth 1 -type f -exec sh -c 'printf "%s: " "$1"; wc -c < "$1"' sh {} \;
chmod 700 secrets
chmod 644 secrets/*
```

不要输出文件内容。

## Prisma 报数据库 URL 端口无效

不要手工拼接生产 `DATABASE_URL`。容器入口会从 `POSTGRES_HOST`、`POSTGRES_PORT` 和 secret 文件安全生成并 URL 编码密码。拉取最新代码后重新构建 app。

## 备份提示 `restore-staging does not exist`

```bash
mkdir -p /volume2/docker/EnglishLearning/backups/restore-staging
```

最新部署脚本和 Compose 已会自动创建该目录。

## 如何升级

```bash
cd /volume2/docker/EnglishLearning
./scripts/nas-deploy.sh
```

脚本会先创建备份，再拉取代码、构建、迁移、启动并等待健康检查。详见 [升级与回滚](upgrade-rollback.md)。

## 是否必须先申请 AI API

不是。网站和非 AI 基础功能可以先运行。要使用 AI 老师、AI 阅读生成、写作深度批改和 AI 个性化计划时，再在后台配置 OpenAI、Gemini、OpenRouter、Ollama 或兼容接口。密钥只在服务器端加密保存。详见 [AI Provider 配置](ai-provider.md)。

## 如何重置管理员密码

先创建完整备份。然后在 NAS 项目目录使用项目内初始化脚本的管理流程，不要直接在数据库中保存明文密码。为避免误覆盖，日常容器启动不会根据 secret 自动重置已存在管理员。若需要实施重置，请先确认目标邮箱和备份状态，再按当前版本的运维说明执行；不要删除用户记录，因为它关联家庭和审计数据。

## 为什么不能在网页里直接恢复数据库

恢复会强制重建正在运行的数据库，必须停止 app 并由 NAS 管理员显式执行隔离的 operations 容器。后台提供备份列表、下载、删除和恢复说明，但不会让普通网页请求在线覆盖数据库。详见 [备份与恢复](backup-restore.md)。

## 手机无法录音或语音识别

浏览器麦克风通常要求 HTTPS 或 localhost。确保允许麦克风权限；SpeechRecognition 的可用性取决于浏览器。录音和手动输入仍可独立使用，未来可通过统一语音接口切换外部识别服务。

## 如何获取诊断信息

```bash
cd /volume2/docker/EnglishLearning
docker compose ps -a
docker compose logs --tail=300 app postgres
docker compose config
```

分享日志前先检查其中没有密码、Token 或其他私密信息。
