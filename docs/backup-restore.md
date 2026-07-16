# 备份与恢复

HomeLingua 的有效备份必须同时包含 PostgreSQL 数据、`uploads` 文件和校验清单。`settings_encryption_key` 不进入常规备份，必须单独离线保存；缺失原密钥时，数据库中已有的 AI Provider Key 无法解密。

## 创建备份

在项目目录执行：

```bash
cd /volume2/docker/EnglishLearning
docker compose --profile operations run --rm backup
```

输出位于 `backups/homelingua-YYYYMMDDTHHMMSSZ/`，包括：

- `database.dump`：PostgreSQL custom-format dump；
- `uploads.tar.gz`：上传文件归档；
- `settings.dump`：系统设置和 AI 路由的独立配置快照（API Key 仍是密文）；
- `manifest.txt`：应用版本、时间和数据库名；
- `checksums.sha256`：上述文件的 SHA-256。

默认保留 30 天，可在 `.env` 设置 `BACKUP_RETENTION_DAYS`。建议将完整目录复制到另一块磁盘，并定期执行校验：

```bash
cd backups/homelingua-时间戳
sha256sum -c checksums.sha256
```

管理员后台的“运维与备份”页可以逐项下载备份文件，也可以在输入完整备份名称后二次确认删除。手动创建仍由 NAS 运行隔离的 backup 容器，应用容器不会挂载危险的 Docker socket。

## 定时备份

在群晖“控制面板 → 任务计划 → 新增 → 计划的任务 → 用户定义的脚本”中，以 root 每天凌晨运行：

```bash
cd /volume2/docker/EnglishLearning
/usr/local/bin/docker compose --profile operations run --rm backup >> logs/backup.log 2>&1
```

如果 Docker 实际路径不同，先执行 `command -v docker` 后替换。备份容器按照 `BACKUP_RETENTION_DAYS` 自动清理过期目录。

## 恢复演练

恢复会重建目标数据库，属于破坏性操作。先备份当前状态，停止 app，并确认目标目录：

```bash
cd /volume2/docker/EnglishLearning
docker compose --profile operations run --rm backup
docker compose stop app
docker compose --profile operations run --rm \
  --entrypoint /scripts/restore.sh \
  -e CONFIRM_RESTORE=yes \
  backup /backups/homelingua-时间戳
```

脚本先校验 SHA-256，再重建数据库。uploads 会解压到 `backups/restore-staging/uploads`，不会自动覆盖线上文件。检查后再由 NAS 管理员将其同步到项目 `uploads/`。确保恢复原来的 `secrets/settings_encryption_key`，然后启动并验证：

```bash
docker compose up -d app
docker compose ps
curl -f http://127.0.0.1:3000/api/health/ready
```

至少每季度做一次恢复演练，并在另一目录或测试 NAS 上验证登录、家庭数据、学习进度和 AI Key 解密。
