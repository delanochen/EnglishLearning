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

  const grammar = await db.grammarTopic.upsert({ where: { slug: "simple-present" }, update: {}, create: { slug: "simple-present", title: "Simple Present 一般现在时", ruleEn: "Use the simple present for habits, routines, and facts. Add -s or -es after the verb when the subject is he, she, or it.", ruleZh: "一般现在时用于习惯、日常活动和客观事实。主语是 he、she 或 it 时，动词通常加 -s 或 -es。", level: CefrLevel.A1 } });
  if (!await db.grammarExample.findFirst({ where: { topicId: grammar.id } })) await db.grammarExample.createMany({ data: [{ topicId: grammar.id, sentence: "She walks to school every day.", translation: "她每天步行上学。" }, { topicId: grammar.id, sentence: "He walk to school every day.", translation: "错误：第三人称单数缺少 s。", isError: true, explanation: "Use walks after he." }] });
  const grammarQuestions = [{ order: 1, prompt: "My father ___ coffee every morning.", options: ["drink", "drinks", "drinking"], answerKey: "drinks", explanation: "Father is third-person singular." }, { order: 2, prompt: "They ___ near the library.", options: ["live", "lives", "living"], answerKey: "live", explanation: "Use the base verb after they." }];
  for (const question of grammarQuestions) await db.grammarExercise.upsert({ where: { topicId_order: { topicId: grammar.id, order: question.order } }, update: question, create: { topicId: grammar.id, type: QuestionType.MULTIPLE_CHOICE, ...question } });

  let listening = await db.listeningExercise.findFirst({ where: { title: "Ordering at a Coffee Shop", level: CefrLevel.A2 } });
  if (!listening) listening = await db.listeningExercise.create({ data: { title: "Ordering at a Coffee Shop", level: CefrLevel.A2, topic: "US life", transcript: "Good morning. Could I have a medium coffee with milk, please? Sure. Would you like anything to eat? Yes, one blueberry muffin. That's six dollars and fifty cents.", translation: "早上好。请给我一杯加牛奶的中杯咖啡。好的。您需要吃点什么吗？需要，一个蓝莓松饼。一共六美元五十美分。" } });
  const listeningQuestions = [{ order: 1, prompt: "What size coffee does the customer order?", options: ["Small", "Medium", "Large"], answerKey: "Medium", explanation: "The customer asks for a medium coffee." }, { order: 2, prompt: "What food does the customer buy?", options: ["A sandwich", "A muffin", "A cookie"], answerKey: "A muffin", explanation: "The customer orders a blueberry muffin." }];
  for (const question of listeningQuestions) await db.listeningQuestion.upsert({ where: { exerciseId_order: { exerciseId: listening.id, order: question.order } }, update: question, create: { exerciseId: listening.id, ...question } });

  if (!await db.writingAssignment.findFirst({ where: { title: "Introduce Your Daily Routine", level: CefrLevel.A2 } })) await db.writingAssignment.create({ data: { title: "Introduce Your Daily Routine", type: "PARAGRAPH", prompt: "Write a short paragraph about your weekday routine. Say when you get up, what you do during the day, and what you do in the evening.", level: CefrLevel.A2, targetWords: 80 } });

  const scenario = await db.scenarioLesson.upsert({ where: { category_title_version: { category: "餐厅与咖啡店", title: "在咖啡店自然点单", version: 1 } }, update: {}, create: { category: "餐厅与咖啡店", title: "在咖啡店自然点单", intro: "学习在美国咖啡店选择杯型、说明定制要求并礼貌回应店员。", level: CefrLevel.A2, cultureTips: ["店员询问名字通常是为了标记订单，不是正式介绍。", "Would you like room for cream? 是询问是否要给奶油留空间。"], misunderstandings: ["A regular coffee 有时表示滴滤咖啡，但不同地区含义可能不同。", "For here or to go? 是询问堂食还是带走。"], naturalExpressions: ["Could I get a medium latte?", "Can I have that with oat milk?", "That's all, thank you."], sourceType: "ORIGINAL", sourceNote: "HomeLingua 原创家庭学习内容" } });
  const dialogueRows = [
    { sequence: 1, speaker: "Barista", roleName: "咖啡师", textEn: "Hi! What can I get started for you?", textZh: "你好！想喝点什么？", cameraCue: "咖啡师微笑迎接顾客" },
    { sequence: 2, speaker: "Customer", roleName: "顾客", textEn: "Could I get a medium latte with oat milk, please?", textZh: "请给我一杯用燕麦奶做的中杯拿铁。", cameraCue: "顾客查看菜单后点单" },
    { sequence: 3, speaker: "Barista", roleName: "咖啡师", textEn: "Sure. Is that for here or to go?", textZh: "好的。堂食还是带走？", cameraCue: "咖啡师在收银机上确认订单" },
    { sequence: 4, speaker: "Customer", roleName: "顾客", textEn: "To go, please. That's all, thank you.", textZh: "带走。就这些，谢谢。", cameraCue: "顾客完成订单" }
  ];
  for (const row of dialogueRows) await db.scenarioDialogue.upsert({ where: { lessonId_sequence: { lessonId: scenario.id, sequence: row.sequence } }, update: row, create: { lessonId: scenario.id, ...row } });
  const scenarioQuestions = [{ order: 1, prompt: "Which milk does the customer request?", options: ["Whole milk", "Oat milk", "Soy milk"], answerKey: "Oat milk", explanation: "The customer asks for oat milk." }, { order: 2, prompt: "Is the order for here or to go?", options: ["For here", "To go"], answerKey: "To go", explanation: "The customer says 'To go, please.'" }];
  for (const row of scenarioQuestions) await db.scenarioExercise.upsert({ where: { lessonId_order: { lessonId: scenario.id, order: row.order } }, update: row, create: { lessonId: scenario.id, type: QuestionType.MULTIPLE_CHOICE, ...row } });
  await db.videoLesson.upsert({ where: { scenarioLessonId: scenario.id }, update: {}, create: { scenarioLessonId: scenario.id, title: "咖啡店点单图文时间线", durationSeconds: 150, timeline: [{ at: 0, title: "进入咖啡店", note: "先查看菜单和排队方式" }, { at: 30, title: "说明饮品", note: "杯型、饮品、奶类和温度" }, { at: 90, title: "确认方式", note: "For here or to go" }, { at: 125, title: "付款取餐", note: "听取名字或订单号" }] } });
}

main().finally(() => db.$disconnect());
