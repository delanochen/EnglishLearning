# 第一次启动与管理员初始化

## 1. 准备目录

群晖默认安装目录：

```bash
cd /volume2/docker/EnglishLearning
mkdir -p data/postgres uploads logs backups/restore-staging secrets
chmod 700 secrets
```

源码工作目录和 NAS 安装目录是两个独立目录：Windows 开发目录为 `D:\MyDocuments\EnglishLearning`，NAS 运行目录为 `/volume2/docker/EnglishLearning`。代码通过 GitHub 同步，不要把 Windows 的 `.env` 当作 NAS 源码目录。

## 2. 创建 Docker secrets

必须存在以下五个文件，每个文件只保存一行真实值且不能带引号：

```text
secrets/postgres_password
secrets/auth_secret
secrets/settings_encryption_key
secrets/initial_admin_email
secrets/initial_admin_password
```

在 NAS 上生成随机值的示例：

```bash
openssl rand -base64 36 > secrets/postgres_password
openssl rand -base64 48 > secrets/auth_secret
openssl rand -hex 32 > secrets/settings_encryption_key
printf '%s\n' '你的管理员邮箱' > secrets/initial_admin_email
```

管理员密码请用编辑器或安全的交互方式写入 `secrets/initial_admin_password`，不要把密码贴进聊天、Shell 历史或 Git。完成后：

```bash
chmod 700 secrets
chmod 644 secrets/*
```

`settings_encryption_key` 必须单独离线保存。丢失它以后，数据库中的 AI API Key 密文无法恢复。

## 3. 首次构建

```bash
cd /volume2/docker/EnglishLearning
docker compose config
docker compose build --pull app
docker compose up -d
docker compose ps
```

应用容器启动时会自动执行：

1. `prisma migrate deploy`；
2. 幂等课程 seed；
3. 初始管理员初始化；
4. Next.js 服务启动。

首次启动可能需要数分钟。查看进度：

```bash
docker compose logs -f --tail=200 app postgres
```

## 4. 健康检查与登录

```bash
curl -f http://127.0.0.1:3000/api/health/live
curl -f http://127.0.0.1:3000/api/health/ready
```

两项均成功后，在家庭网络打开 `http://NAS-IP:3000`，使用 `initial_admin_email` 和 `initial_admin_password` 中的值登录。首次登录后立即在“账号安全”修改密码。

管理员已存在时，容器重启不会覆盖密码。忘记密码时不要修改 secret 后期待自动覆盖；应按 [常见问题](faq.md) 中的安全重置流程处理。

## 5. 首次业务配置

1. 创建家庭及成员档案；
2. 完成首次水平测试；
3. 在“管理 → AI 模型”添加 Provider 和模型；
4. 测试连接及测试生成；
5. 为 TUTOR、READING、WRITING、LEARNING_PLAN 等用途配置主模型和备用模型；
6. 在“运维与备份”创建第一份完整备份并下载校验清单；
7. 按 [部署说明](deployment.md) 配置自动任务、周报、月报和定时备份。

AI Provider 不是启动网站的前置条件；未配置 AI 时，基础课程、规则型计划和部分安全降级功能仍可使用。
