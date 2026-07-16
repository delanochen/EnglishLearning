# 群晖 NAS 升级与回滚

工作目录：`/volume2/docker/EnglishLearning`。以下命令只复制命令本身，不要把终端输出中的 `✔`、`[+] Running` 等文字再次输入。

## 安全升级

```bash
cd /volume2/docker/EnglishLearning
git config --global --add safe.directory /volume2/docker/EnglishLearning
docker compose --profile operations run --rm backup
git pull origin main
docker compose build --no-cache app
docker compose up -d
docker compose ps
docker compose logs --tail=200 app postgres
curl -f http://127.0.0.1:3000/api/health/ready
```

容器入口会执行 `prisma migrate deploy`、幂等 seed 和管理员初始化。不要执行 `prisma migrate reset`。

## 代码回滚

数据库迁移通常只新增表和字段。优先回滚应用镜像而不回滚数据库：

```bash
cd /volume2/docker/EnglishLearning
git log --oneline -10
git switch --detach <之前验证过的提交>
docker compose up -d --build app
```

确认旧版正常后，可继续保持 detached 状态等待修复；恢复最新版使用：

```bash
git switch main
git pull origin main
docker compose up -d --build app
```

只有在数据结构或数据本身损坏时才执行完整数据库恢复，并严格遵循 [备份与恢复](backup-restore.md)。

## 常见检查

```bash
pwd
docker compose config
docker compose ps -a
docker compose logs --tail=300 app postgres
curl -v http://127.0.0.1:3000/api/health/live
curl -v http://127.0.0.1:3000/api/health/ready
```

若浏览器提示拒绝连接，先确认 app 容器为 `Up` 且端口显示 `0.0.0.0:3000->3000/tcp`。
