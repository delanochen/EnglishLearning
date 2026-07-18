import { describe, expect, it } from "vitest";
import { dailyTaskOutputSchema, placementReportSchema, readingArticleSchema, scenarioCourseSchema, vocabularyCourseSchema, weeklyPlanOutputSchema } from "@/modules/ai/content-schemas";

describe("AI content schemas", () => {
  it("normalizes common DeepSeek reading field aliases",()=>{
    const payload={article:{title:"High school",content:"Students arrive early for classes and spend the day learning, joining clubs, meeting friends, and preparing carefully for future opportunities in their community.",level:"B1",target_audience:"teens",theme:"school",target_vocabulary:["club"],target_grammar:["present simple"],abstract:"A school day."},questions:[{type:"multiple-choice",question:"Where are the students?",options:["School","Home"],correct_answer:"School",rationale:"The passage says so."},{type:"true-false",question:"They study.",correct_answer:"True"},{type:"short-answer",question:"Name one activity.",correct_answer:"Joining clubs"}]};
    const parsed=readingArticleSchema.parse(payload);
    expect(parsed.body).toContain("Students arrive");expect(parsed.questions[0]?.type).toBe("MULTIPLE_CHOICE");expect(parsed.audience).toBe("teens");
  });
  it("rejects incomplete vocabulary output", () => expect(vocabularyCourseSchema.safeParse({ word: "learn" }).success).toBe(false));
  it("accepts a structured daily task", () => expect(dailyTaskOutputSchema.safeParse({ taskType: "READING", title: "Read", description: "One article", estimatedMinutes: 10, xpReward: 10, reason: "level" }).success).toBe(true));
  it("bounds placement section scores", () => expect(placementReportSchema.safeParse({ assessedLevel: "A2", sectionScores: { reading: 120 }, strengths: [], weakAreas: [], recommendations: [] }).success).toBe(false));
  it("requires the complete personalized plan output", () => {
    const complete = { goals: ["Study five days"], focusAreas: ["listening"], recommendedCourses: ["A2 listening"], reviewContent: ["weak words"], stageGoals: ["Improve comprehension in four weeks"], monthlyEvaluation: "Compare all module scores at month end.", adjustmentSuggestions: ["Add shadowing"], items: [{ dayOffset: 0, module: "LISTENING", title: "Listen", target: "one lesson", durationMinutes: 15, reason: "weak area" }] };
    expect(weeklyPlanOutputSchema.safeParse(complete).success).toBe(true);
    expect(weeklyPlanOutputSchema.safeParse({ ...complete, monthlyEvaluation: undefined }).success).toBe(false);
  });
  it("rejects short, low-value scenario lessons and accepts a full task course", () => {
    const question = { type: "MULTIPLE_CHOICE", prompt: "What should the learner do next?", options: ["Confirm the details", "Leave"], answerKey: "Confirm the details", explanation: "Confirming prevents mistakes." };
    const fullCourse = {
      category: "Healthcare",
      title: "Urgent care visit",
      intro: "Complete a realistic urgent-care visit from check-in through symptom questions, insurance confirmation, treatment instructions, pharmacy details, and follow-up planning.",
      level: "A2",
      cultureTips: ["Bring photo ID.", "Bring an insurance card.", "Ask for written instructions."],
      misunderstandings: ["Urgent care is not always an emergency room.", "A copay is not necessarily the full bill."],
      naturalExpressions: ["I'd like to check in.", "My symptoms started yesterday.", "Is this covered?", "Could I get that in writing?"],
      dialogues: Array.from({ length: 16 }, (_, index) => ({ speaker: index % 2 ? "Patient" : "Staff", roleName: index % 2 ? "Patient" : "Staff member", textEn: `This is realistic dialogue line number ${index + 1}.`, textZh: `这是第 ${index + 1} 句真实对话。`, cameraCue: "Complete the task" })),
      exercises: Array.from({ length: 6 }, () => question),
    };
    expect(scenarioCourseSchema.safeParse(fullCourse).success).toBe(true);
    expect(scenarioCourseSchema.safeParse({ ...fullCourse, dialogues: fullCourse.dialogues.slice(0, 5) }).success).toBe(false);
    expect(scenarioCourseSchema.safeParse({ ...fullCourse, exercises: fullCourse.exercises.slice(0, 2) }).success).toBe(false);
  });
});
