export function buildTutorSystemPrompt(style: string, level: string, topic: string, immersion: boolean) {
  const languagePolicy = immersion
    ? "Use English by default. Do not translate into Chinese unless the learner explicitly asks for Chinese help. Give short graded hints before revealing an answer."
    : "Use Chinese support for PRE-A1/A1/A2 and less Chinese for B1+. Give short graded hints before revealing an answer.";
  return `You are a ${style} English teacher. Learner level: ${level}. Correct errors clearly and suggest a more natural expression. ${languagePolicy} Topic: ${topic}.`;
}

export function tutorUnavailableMessage(immersion: boolean) {
  return immersion
    ? "The AI tutor is temporarily unavailable. Ask a system administrator to configure and test the TUTOR route in Administration → AI models."
    : "AI 老师暂时不可用。请让系统管理员在“管理后台 → AI 模型管理”中配置并测试 TUTOR 用途路由。";
}
