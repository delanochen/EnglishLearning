export type ReportType = "WEEKLY" | "MONTHLY";

export function reportPeriod(type: ReportType, now = new Date()) {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(end);
  if (type === "MONTHLY") start.setUTCDate(1);
  else {
    const day = start.getUTCDay();
    start.setUTCDate(start.getUTCDate() - (day === 0 ? 6 : day - 1));
  }
  return { start, end };
}

export function reportInsights(metrics: { activityCount: number; completionRate: number; strongestModule: string | null }) {
  return {
    strengths: metrics.strongestModule ? [`${metrics.strongestModule} 参与度最高`] : ["已建立学习档案"],
    weakAreas: metrics.completionRate < 60 ? ["任务完成率需要提高"] : [],
    recommendations: metrics.activityCount
      ? ["继续保持每日短时学习", "优先复习错题和到期单词"]
      : ["先完成一项每日任务"],
  };
}
