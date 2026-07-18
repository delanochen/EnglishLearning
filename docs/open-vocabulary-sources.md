# 免费词库来源

HomeLingua 支持从 Open English WordNet 2025 导入英语词汇、英文释义、词性和可用例句。该资源由 Open English WordNet Community 发布，采用 CC BY 4.0 许可：<https://en-word.net/downloads>。

NAS 一次性导入示例（默认导入 5,000 条并标记为 B1）：

```sh
cd /volume2/docker/EnglishLearning
docker compose exec -e OEWN_LIMIT=5000 -e OEWN_LEVEL=B1 app ./scripts/import-open-wordnet.sh
```

可用等级为 `PRE_A1`、`A1`、`A2`、`B1`、`B2`、`C1`。Open English WordNet 本身不提供 CEFR 分级，因此必须明确选择导入目标等级，之后可在内容管理中审核和调整。重复执行采用 upsert，不会创建相同单词与词性的重复记录。

不要直接复制 Oxford 3000、Cambridge Dictionary 或 English Vocabulary Profile 的内容，除非另外获得许可。
