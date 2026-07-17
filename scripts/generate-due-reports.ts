import { PrismaClient } from "@prisma/client";
import { summarizeActivities } from "../modules/reports/metrics";
import { reportInsights, reportPeriod, type ReportType } from "../modules/reports/period";

const db = new PrismaClient();

async function generate(profileId: string, type: ReportType) {
  const { start, end } = reportPeriod(type);
  const [activities, assigned, completed] = await Promise.all([
    db.learningActivity.findMany({
      where: { learnerProfileId: profileId, occurredAt: { gte: start } },
      select: { module: true, durationSeconds: true, score: true },
    }),
    db.dailyTask.count({ where: { learnerProfileId: profileId, taskDate: { gte: start, lte: end } } }),
    db.dailyTask.count({ where: { learnerProfileId: profileId, taskDate: { gte: start, lte: end }, status: "COMPLETED" } }),
  ]);
  const metrics = summarizeActivities(activities, assigned, completed);
  const insights = reportInsights(metrics);
  const common = { periodEnd: end, metrics, ...insights, generatedAt: new Date() };

  if (type === "WEEKLY") {
    const existing = await db.weeklyReport.findFirst({
      where: { learnerProfileId: profileId, periodStart: start, generationType: "AUTOMATED" },
    });
    if (existing) {
      await db.weeklyReport.update({ where: { id: existing.id }, data: common });
      return "updated";
    }
    const version = await db.weeklyReport.count({ where: { learnerProfileId: profileId, periodStart: start } }) + 1;
    await db.weeklyReport.create({ data: { learnerProfileId: profileId, periodStart: start, version, generationType: "AUTOMATED", ...common } });
  } else {
    const existing = await db.monthlyReport.findFirst({
      where: { learnerProfileId: profileId, periodStart: start, generationType: "AUTOMATED" },
    });
    if (existing) {
      await db.monthlyReport.update({ where: { id: existing.id }, data: common });
      return "updated";
    }
    const version = await db.monthlyReport.count({ where: { learnerProfileId: profileId, periodStart: start } }) + 1;
    await db.monthlyReport.create({ data: { learnerProfileId: profileId, periodStart: start, version, generationType: "AUTOMATED", ...common } });
  }

  await db.notification.create({
    data: {
      learnerProfileId: profileId,
      type: `${type}_REPORT_READY`,
      title: type === "WEEKLY" ? "本周学习报告已生成" : "本月学习评估已生成",
      body: "查看学习时长、完成率、优势、薄弱项和下一阶段建议。",
    },
  });
  return "created";
}

async function main() {
  const profiles = await db.learnerProfile.findMany({ select: { id: true } });
  let created = 0;
  let updated = 0;
  for (const profile of profiles) {
    for (const type of ["WEEKLY", "MONTHLY"] as const) {
      const result = await generate(profile.id, type);
      if (result === "created") created++;
      else updated++;
    }
  }
  console.log(`Reports refreshed for ${profiles.length} profiles: ${created} created, ${updated} updated.`);
}

main().finally(() => db.$disconnect());
