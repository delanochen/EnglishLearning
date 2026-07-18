# 免费词库来源

HomeLingua 支持从 Open English WordNet 2025 导入英语词汇、英文释义、词性和可用例句。该资源由 Open English WordNet Community 发布，采用 CC BY 4.0 许可：<https://en-word.net/downloads>。

NAS 一次性导入示例（默认导入 5,000 条并标记为 B1）：

```sh
cd /volume2/docker/EnglishLearning
docker compose exec -e OEWN_LIMIT=5000 -e OEWN_LEVEL=B1 app ./scripts/import-open-wordnet.sh
```

如果前 5,000 条已经作为 B1 导入，可继续导入三个互不重叠的区段：

```sh
docker compose exec -e OEWN_SKIP=5000 -e OEWN_LIMIT=5000 -e OEWN_LEVEL=B2 app ./scripts/import-open-wordnet.sh
docker compose exec -e OEWN_SKIP=10000 -e OEWN_LIMIT=5000 -e OEWN_LEVEL=C1 app ./scripts/import-open-wordnet.sh
docker compose exec -e OEWN_SKIP=15000 -e OEWN_LIMIT=5000 -e OEWN_LEVEL=C2 app ./scripts/import-open-wordnet.sh
```

可用等级为 `PRE_A1`、`A1`、`A2`、`B1`、`B2`、`C1`、`C2`。`OEWN_SKIP` 按稳定的“单词 + 词性”唯一顺序跳过记录，避免后续区段覆盖前一区段。

Open English WordNet 本身不提供 CEFR 分级，上述区段只是待审核的扩展词库，并非官方 CEFR 词表。导入后应在内容管理中抽查并调整等级。重复执行相同区段采用 upsert，不会创建相同单词与词性的重复记录。

不要直接复制 Oxford 3000、Cambridge Dictionary 或 English Vocabulary Profile 的内容，除非另外获得许可。
