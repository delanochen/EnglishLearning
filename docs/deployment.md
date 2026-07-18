# Docker 与群晖部署说明

## 一键升级与验收

仓库已提供 `scripts/nas-deploy.sh`。它会检查 secrets、对正在运行的版本先做备份、拉取 main、构建启动，并等待 ready 健康检查；失败时会直接打印容器状态和最近日志。

```bash
cd /volume2/docker/EnglishLearning
git config --global --add safe.directory /volume2/docker/EnglishLearning
git pull --ff-only origin main
chmod +x scripts/nas-deploy.sh
./scripts/nas-deploy.sh
```

## GitHub 推送后自动更新

仓库提供 `scripts/nas-auto-update.sh`。它只在 `origin/main` 出现新提交时调用完整部署流程，并使用目录锁避免两个部署同时运行。若 NAS 上的受版本控制文件存在本地修改，脚本会停止，避免覆盖修改。

在群晖打开“控制面板 → 任务计划 → 新增 → 计划的任务 → 用户定义的脚本”：

- 用户：`root`
- 频率：每 10 分钟（家庭环境建议，不必每分钟检查）
- 用户定义的脚本：

```sh
/bin/sh /volume2/docker/EnglishLearning/scripts/nas-auto-update.sh
```

更新脚本只有在以下条件全部成立后才提交“部署成功”通知：完整部署脚本退出成功、Git提交号与 `origin/main` 一致、`/api/health/live` 返回的运行版本与仓库 `package.json` 一致。没有新版本时不会通知。

成功通知通过群晖原生 `synodsmnotify` 发送给管理员组。请先在“控制面板 → 通知 → 电子邮件”中完成发件服务和管理员收件地址测试，并确保系统通知允许通过邮件送达。任务脚本保持不变：

```sh
/bin/sh /volume2/docker/EnglishLearning/scripts/nas-auto-update.sh
```

如需把DSM通知发送给另一个DSM用户或群组，可在计划任务中设置目标（默认是 `@administrators`）：

```sh
AUTO_UPDATE_NOTIFY_TARGET="@administrators" /bin/sh /volume2/docker/EnglishLearning/scripts/nas-auto-update.sh
```

通知提交结果也会写入 `logs/auto-update.log`，成功通知的Git提交号保存在 `logs/last-notified-commit`。如果部署成功但邮件服务暂时不可用，后续计划任务会重试通知而不会重复部署。若日志显示找不到 `synodsmnotify`，说明当前DSM版本未提供该命令；部署本身仍会保留为成功，不会因此回滚健康容器。

运行日志保存在：

```text
/volume2/docker/EnglishLearning/logs/auto-update.log
```

第一次启用计划任务前，仍应手工运行一次 `./scripts/nas-deploy.sh`，确认 secrets、备份、数据库迁移和健康检查全部正常。自动更新不会自动覆盖 NAS 本地代码，也不会在健康检查失败后把失败部署记录成成功。

## 自动每日任务、周报和月度评估

在群晖任务计划中每天凌晨运行以下命令。任务具有幂等性：每天自动生成个性化任务，同一成员同一周期只生成一次周报或月报：

```bash
cd /volume2/docker/EnglishLearning
/usr/local/bin/docker compose --profile operations run --rm reports >> logs/reports.log 2>&1
```

## 持久化边界

项目使用以下宿主目录：`data/postgres`、`uploads`、`logs`、`backups` 和 `secrets`。`settings_encryption_key` 必须单独离线保存；缺少原密钥将无法解密已有 AI Provider Key。

## 群晖首次部署

1. 将仓库放在 `/volume2/docker/EnglishLearning`。
2. 创建 `.env` 和五个无 `.example` 后缀的 secret 文件。
3. 通过共享目录 ACL 限制项目访问，并执行：

   ```bash
   cd /volume2/docker/EnglishLearning
   chmod 700 secrets
   chmod 644 secrets/*
   docker compose config
   docker compose up -d --build
   docker compose ps
   curl -f http://127.0.0.1:3000/api/health/ready
   ```

4. 浏览器打开 `http://NAS-IP:3000`。外网访问必须使用 HTTPS 反向代理或可信 VPN。

app 使用非 root 用户；PostgreSQL 只在 Compose 内部网络开放。Adminer 位于 `tools` profile，并只绑定 `127.0.0.1`：

```bash
docker compose --profile tools up -d adminer
```

## 备份、升级和回滚

- [备份与恢复](backup-restore.md)
- [群晖升级与回滚](upgrade-rollback.md)

升级前必须生成正式备份并保留原 secrets。容器入口只运行 `prisma migrate deploy`、幂等 seed 和管理员初始化，不执行数据库 reset。

## 故障排查

```bash
cd /volume2/docker/EnglishLearning
docker compose config
docker compose ps -a
docker compose logs --tail=300 app postgres
curl -v http://127.0.0.1:3000/api/health/live
curl -v http://127.0.0.1:3000/api/health/ready
```

- app restarting：确认 secrets 文件存在且可由容器读取，查看迁移和初始化日志。
- ready 返回 503：响应会标出 database、uploads 或 logs 的失败项。
- 浏览器拒绝连接：确认 app 为 `Up`，并显示 `0.0.0.0:3000->3000/tcp`。
- `not a git repository` 或找不到 Compose：先执行正确的 `cd`，不要在 `/root` 目录运行项目命令。
- `dubious ownership`：执行 `git config --global --add safe.directory /volume2/docker/EnglishLearning`。
- 无法登录：确认邮箱小写、账号未禁用，并检查登录失败限流。
