# Docker 与群晖部署说明

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
