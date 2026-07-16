import { CefrLevel, PrismaClient, QuestionType, RoleScope } from "@prisma/client";

const db = new PrismaClient();
const permissions = [
  ["system.manage", "system", "manage"], ["family.manage", "family", "manage"],
  ["family.read", "family", "read"], ["profile.manage", "profile", "manage"],
  ["profile.read.own", "profile", "read-own"], ["report.read.family", "report", "read-family"]
] as const;
const roleMap = {
  SYSTEM_ADMIN: permissions.map(([code]) => code),
  FAMILY_OWNER: ["family.manage", "family.read", "profile.manage", "report.read.family"],
  PARENT: ["family.read", "profile.manage", "report.read.family"],
  LEARNER: ["family.read", "profile.read.own"],
  CHILD: ["profile.read.own"]
};

async function main() {
  for (const [code, resource, action] of permissions) {
    await db.permission.upsert({ where: { code }, update: {}, create: { code, resource, action } });
  }
  for (const [code, permissionCodes] of Object.entries(roleMap)) {
    const role = await db.role.upsert({
      where: { code }, update: {},
      create: { code, name: code.replaceAll("_", " "), scope: code === "SYSTEM_ADMIN" ? RoleScope.SYSTEM : RoleScope.FAMILY }
    });
    const rows = await db.permission.findMany({ where: { code: { in: permissionCodes } } });
    for (const permission of rows) await db.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } }, update: {},
      create: { roleId: role.id, permissionId: permission.id }
    });
  }

  const words = [
    { word: "grocery", phonetic: "/ˈɡroʊsəri/", partOfSpeech: "noun", definitionEn: "food and household items sold in a store", definitionZh: "食品杂货", level: CefrLevel.A1, topic: "Daily life", sentence: "We need to buy some groceries after work.", translation: "我们下班后需要买些食品杂货。" },
    { word: "appointment", phonetic: "/əˈpɔɪntmənt/", partOfSpeech: "noun", definitionEn: "an arranged time to meet someone", definitionZh: "预约；约会", level: CefrLevel.A2, topic: "Daily life", sentence: "I have a doctor's appointment at three.", translation: "我三点预约了医生。" },
    { word: "improve", phonetic: "/ɪmˈpruːv/", partOfSpeech: "verb", definitionEn: "to become or make something better", definitionZh: "改善；提高", level: CefrLevel.A2, topic: "Learning", sentence: "Reading every day can improve your English.", translation: "每天阅读可以提高你的英语。" },
    { word: "confident", phonetic: "/ˈkɑːnfɪdənt/", partOfSpeech: "adjective", definitionEn: "feeling sure about your abilities", definitionZh: "自信的", level: CefrLevel.B1, topic: "Growth", sentence: "She feels confident speaking in meetings.", translation: "她在会议上发言时感到自信。" }
  ];
  for (const item of words) {
    const vocabulary = await db.vocabulary.upsert({
      where: { word_partOfSpeech: { word: item.word, partOfSpeech: item.partOfSpeech } },
      update: { phonetic: item.phonetic, definitionEn: item.definitionEn, level: item.level, topic: item.topic },
      create: { word: item.word, phonetic: item.phonetic, partOfSpeech: item.partOfSpeech, definitionEn: item.definitionEn, level: item.level, topic: item.topic }
    });
    await db.vocabularyMeaning.upsert({ where: { vocabularyId_locale_senseOrder: { vocabularyId: vocabulary.id, locale: "zh-CN", senseOrder: 1 } }, update: { definition: item.definitionZh }, create: { vocabularyId: vocabulary.id, locale: "zh-CN", definition: item.definitionZh } });
    const example = await db.vocabularyExample.findFirst({ where: { vocabularyId: vocabulary.id, sentence: item.sentence } });
    if (!example) await db.vocabularyExample.create({ data: { vocabularyId: vocabulary.id, sentence: item.sentence, translation: item.translation, collocations: [], difficulty: item.level } });
  }

  const articleSeed = {
    title: "A Saturday at the Farmers' Market", level: CefrLevel.A2, audience: "青少年与成人", topic: "US life",
    body: "On Saturday morning, Mia visits the farmers' market with her father. The market is busy but friendly. Local farmers sell fresh apples, tomatoes, bread, and honey. Mia asks a farmer how much the strawberries cost. He says they are four dollars a box. Mia buys one box and thanks him. Before they leave, Mia and her father listen to a musician near the entrance. They plan to return next weekend.",
    translation: "星期六早上，米娅和爸爸去了农贸市场。市场很繁忙，但气氛友好。本地农户售卖新鲜的苹果、西红柿、面包和蜂蜜。米娅询问一位农户草莓多少钱。他说每盒四美元。米娅买了一盒并向他道谢。离开前，米娅和爸爸听了入口附近一位音乐家的演奏。他们计划下周末再来。",
    questions: [
      { order: 1, type: QuestionType.MULTIPLE_CHOICE, prompt: "When does Mia visit the market?", options: ["Saturday morning", "Sunday evening", "Monday afternoon"], answerKey: "Saturday morning", explanation: "The first sentence says Saturday morning." },
      { order: 2, type: QuestionType.MULTIPLE_CHOICE, prompt: "How much are the strawberries?", options: ["Two dollars", "Four dollars", "Five dollars"], answerKey: "Four dollars", explanation: "The farmer says they are four dollars a box." }
    ]
  };
  let article = await db.readingArticle.findFirst({ where: { title: articleSeed.title, level: articleSeed.level } });
  if (!article) article = await db.readingArticle.create({ data: { title: articleSeed.title, body: articleSeed.body, translation: articleSeed.translation, level: articleSeed.level, audience: articleSeed.audience, wordCount: articleSeed.body.split(/\s+/).length, topic: articleSeed.topic, targetVocabulary: ["market", "local", "cost"], targetGrammar: ["simple present"] } });
  for (const question of articleSeed.questions) await db.readingQuestion.upsert({ where: { articleId_order: { articleId: article.id, order: question.order } }, update: question, create: { articleId: article.id, ...question } });
}

main().finally(() => db.$disconnect());
