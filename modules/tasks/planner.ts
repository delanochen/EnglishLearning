export type PlannedTask = { taskType: "VOCABULARY" | "READING" | "AI_TUTOR"; title: string; description: string; estimatedMinutes: number; xpReward: number };

export function planDailyTasks(dailyMinutes: number): PlannedTask[] {
  const minutes = Math.max(10, Math.min(120, Math.round(dailyMinutes)));
  if (minutes < 20) return [{ taskType: "VOCABULARY", title: "今日单词复习", description: "完成一组间隔复习", estimatedMinutes: minutes, xpReward: 10 }];
  const vocabulary = Math.max(8, Math.round(minutes * 0.35));
  const reading = Math.max(8, Math.round(minutes * 0.4));
  const result: PlannedTask[] = [
    { taskType: "VOCABULARY", title: "今日单词复习", description: "复习到期单词并学习新词", estimatedMinutes: vocabulary, xpReward: 10 },
    { taskType: "READING", title: "完成一篇分级阅读", description: "阅读文章并回答理解题", estimatedMinutes: reading, xpReward: 15 }
  ];
  const remaining = minutes - vocabulary - reading;
  if (remaining >= 5) result.push({ taskType: "AI_TUTOR", title: "和 AI 老师对话", description: "围绕一个生活主题练习表达", estimatedMinutes: remaining, xpReward: 15 });
  return result;
}
