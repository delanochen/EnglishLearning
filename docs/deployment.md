# Docker 与群晖部署说明

## 持久化与备份边界

必须备份 `data/postgres`、`uploads` 和 `secrets`。其中 `secrets/settings_encryption_key` 必须单独安全保管，不能与普通数据库备份放在同一位置。`logs` 可按保留策略归档，`backups` 用于后续阶段生成的正式备份。

## 群晖建议

1. 在共享文件夹创建 `homelingua`，把仓库放入该目录。
2. 确保容器管理器可读取 secret 文件，且这些文件仅管理员可读。
3. 在 Container Manager 的项目中选择 `docker-compose.yml`。
4. 首次构建可能需要数分钟；等待 app 和 postgres 显示 healthy。
5. 使用群晖反向代理把 HTTPS 域名转发到 `http://127.0.0.1:3000`。
6. WebSocket 无特殊配置要求；上传大小应同时在反向代理和应用层限制。

群晖的 Compose 文件型 secrets 会保留宿主文件权限，而 app 以非 root 用户运行。部署前执行：

```bash
chmod 700 secrets
chmod 644 secrets/*
```

这里的 `644` 用于让容器内的非 root 运行用户读取挂载文件；请通过群晖共享目录 ACL 限制其他 NAS 账号访问整个项目目录。

不要通过群晖 UI 把 PostgreSQL 5432 暴露给局域网或互联网。Adminer 使用 `tools` profile，只在维护期间启动。

## 升级

升级前备份数据库、uploads 和 secrets。拉取新版本后执行：

```bash
docker compose build --pull app
docker compose up -d
docker compose ps
```

入口脚本只运行 `prisma migrate deploy`，不会执行开发用迁移或数据库重置。升级后检查 `/api/health/ready` 和登录流程。

## 故障排查

- app 一直 restarting：查看 `docker compose logs app`，检查 secret 是否存在、管理员密码长度及数据库健康。
- ready 返回 503：响应会指出 database、uploads 或 logs 中哪个检查失败。
- 无法登录：确认邮箱为小写形式，检查账号是否禁用，以及 15 分钟内是否达到失败次数限制。
- NAS 重启后无数据：确认 Compose 工作目录没变化，并检查 `./data/postgres` 的实际挂载路径。

## 当前备份状态

阶段 1 仅提供目录和部署边界；后台手动/定时备份、下载、恢复与审计将在阶段 7 实现。在此之前可在维护窗口使用 PostgreSQL 官方 `pg_dump`，并同时归档 uploads。恢复流程必须先在非生产目录演练。
